import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Normal
from collections import deque
import copy
from app.config import get_device, HYPERPARAMS


class RunningMeanStd:
    def __init__(self, shape=()):
        self.mean = np.zeros(shape, dtype=np.float64)
        self.var = np.ones(shape, dtype=np.float64)
        self.count = 1e-4

    def update(self, x):
        batch_mean = np.mean(x)
        batch_var = np.var(x)
        batch_count = len(x) if hasattr(x, '__len__') else 1
        self._update_from_moments(batch_mean, batch_var, batch_count)

    def _update_from_moments(self, batch_mean, batch_var, batch_count):
        delta = batch_mean - self.mean
        tot_count = self.count + batch_count
        self.mean = self.mean + delta * batch_count / tot_count
        m_a = self.var * self.count
        m_b = batch_var * batch_count
        M2 = m_a + m_b + delta ** 2 * self.count * batch_count / tot_count
        self.var = M2 / tot_count
        self.count = tot_count

    def normalize(self, x):
        return (x - self.mean) / (np.sqrt(self.var) + 1e-8)


class ActorCritic(nn.Module):
    def __init__(self, obs_dim, action_dim, hidden_dims=[256, 256]):
        super().__init__()
        layers = []
        prev = obs_dim
        for h in hidden_dims:
            layers.extend([nn.Linear(prev, h), nn.LayerNorm(h), nn.ReLU()])
            prev = h
        self.shared = nn.Sequential(*layers)
        self.mean = nn.Linear(prev, action_dim)
        self.log_std = nn.Parameter(torch.zeros(action_dim))
        self.value = nn.Linear(prev, 1)
        self._init()

    def _init(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight, gain=np.sqrt(2))
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def forward(self, x):
        f = self.shared(x)
        return torch.tanh(self.mean(f)), self.value(f)

    def get_action(self, x, deterministic=False):
        f = self.shared(x)
        mean = torch.tanh(self.mean(f))
        if deterministic:
            return mean, None, self.value(f)
        std = torch.exp(self.log_std.clamp(-20, 2))
        dist = Normal(mean, std)
        action = dist.sample()
        log_prob = dist.log_prob(action).sum(dim=-1, keepdim=True)
        return torch.clamp(action, -1, 1), log_prob, self.value(f)

    def evaluate(self, x, actions):
        f = self.shared(x)
        mean = torch.tanh(self.mean(f))
        std = torch.exp(self.log_std.clamp(-20, 2))
        dist = Normal(mean, std)
        log_prob = dist.log_prob(actions).sum(dim=-1, keepdim=True)
        entropy = dist.entropy().sum(dim=-1, keepdim=True)
        return log_prob, entropy, self.value(f)


class CentralizedCritic(nn.Module):
    def __init__(self, total_obs_dim, hidden_dims=[256, 256]):
        super().__init__()
        layers = []
        prev = total_obs_dim
        for h in hidden_dims:
            layers.extend([nn.Linear(prev, h), nn.LayerNorm(h), nn.ReLU()])
            prev = h
        self.net = nn.Sequential(*layers)
        self.head = nn.Linear(prev, 1)
        self._init()

    def _init(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight, gain=np.sqrt(2))
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def forward(self, x):
        return self.head(self.net(x))


class RolloutBuffer:
    def __init__(self):
        self.obs, self.actions, self.log_probs, self.rewards, self.dones, self.values = [], [], [], [], [], []

    def add(self, obs, action, log_prob, reward, done, value):
        self.obs.append(obs)
        self.actions.append(action)
        self.log_probs.append(log_prob)
        self.rewards.append(reward)
        self.dones.append(done)
        self.values.append(value)

    def clear(self):
        self.obs, self.actions, self.log_probs, self.rewards, self.dones, self.values = [], [], [], [], [], []

    def compute_returns(self, last_value, gamma=0.99, gae_lambda=0.90):
        returns, advantages = [], []
        gae = 0
        values = self.values + [last_value]
        for t in reversed(range(len(self.rewards))):
            delta = self.rewards[t] + gamma * values[t + 1] * (1 - self.dones[t]) - values[t]
            gae = delta + gamma * gae_lambda * (1 - self.dones[t]) * gae
            advantages.insert(0, gae)
            returns.insert(0, gae + values[t])
        return returns, advantages


class MAPPOAgent:
    def __init__(self, agent_names, obs_dims, action_dims, lr=3e-4, gamma=0.99, hidden_dims=[256, 256]):
        self.agent_names = agent_names
        self.obs_dims = obs_dims
        self.action_dims = action_dims
        self.gamma = gamma
        self.device = get_device()

        self.actors = {}
        self.actor_opts = {}
        for a in agent_names:
            actor = ActorCritic(obs_dims[a], action_dims[a], hidden_dims).to(self.device)
            self.actors[a] = actor
            self.actor_opts[a] = optim.Adam(actor.parameters(), lr=lr)

        total_obs = sum(obs_dims.values())
        self.critic = CentralizedCritic(total_obs, hidden_dims).to(self.device)
        self.critic_opt = optim.Adam(self.critic.parameters(), lr=lr)

    def select_action(self, obs, deterministic=False):
        actions, log_probs, values = {}, {}, {}
        for a in self.agent_names:
            o = torch.FloatTensor(obs[a]).unsqueeze(0).to(self.device)
            with torch.no_grad():
                act, lp, _ = self.actors[a].get_action(o, deterministic)
            actions[a] = act.cpu().numpy()[0]
            log_probs[a] = lp.cpu().numpy()[0] if lp is not None else None

        obs_all = np.concatenate([obs[a] for a in self.agent_names])
        with torch.no_grad():
            v = self.critic(torch.FloatTensor(obs_all).unsqueeze(0).to(self.device))
        for a in self.agent_names:
            values[a] = v.cpu().numpy()[0]

        return actions, log_probs, values

    def get_value(self, obs):
        obs_all = np.concatenate([obs[a] for a in self.agent_names])
        with torch.no_grad():
            v = self.critic(torch.FloatTensor(obs_all).unsqueeze(0).to(self.device))
        return v.cpu().numpy()[0, 0]

    def save(self, path):
        ckpt = {
            'agent_names': self.agent_names,
            'obs_dims': self.obs_dims,
            'action_dims': self.action_dims,
            'critic': self.critic.state_dict()
        }
        for a in self.agent_names:
            ckpt[f'actor_{a}'] = self.actors[a].state_dict()
        torch.save(ckpt, path)

    def load(self, path):
        ckpt = torch.load(path, map_location=self.device)
        self.critic.load_state_dict(ckpt['critic'])
        for a in self.agent_names:
            self.actors[a].load_state_dict(ckpt[f'actor_{a}'])
