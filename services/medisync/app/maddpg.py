import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from collections import deque
import random
from app.config import get_device, HYPERPARAMS

class Actor(nn.Module):
    def __init__(self, obs_dim, action_dim, hidden_dims=[256, 256]):
        super().__init__()
        layers = []
        prev = obs_dim
        for h in hidden_dims:
            layers.extend([nn.Linear(prev, h), nn.LayerNorm(h), nn.ReLU()])
            prev = h
        layers.append(nn.Linear(prev, action_dim))
        layers.append(nn.Tanh())
        self.net = nn.Sequential(*layers)
        self._init()

    def _init(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight, gain=0.01)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def forward(self, x):
        return self.net(x)


class Critic(nn.Module):
    def __init__(self, total_obs_dim, total_action_dim, hidden_dims=[256, 256]):
        super().__init__()
        layers = []
        prev = total_obs_dim + total_action_dim
        for h in hidden_dims:
            layers.extend([nn.Linear(prev, h), nn.LayerNorm(h), nn.ReLU()])
            prev = h
        layers.append(nn.Linear(prev, 1))
        self.net = nn.Sequential(*layers)
        self._init()

    def _init(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight, gain=1.0)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def forward(self, obs, actions):
        return self.net(torch.cat([obs, actions], dim=-1))


class ReplayBuffer:
    def __init__(self, capacity):
        self.buffer = deque(maxlen=capacity)

    def push(self, obs, actions, rewards, next_obs, done):
        self.buffer.append((obs, actions, rewards, next_obs, done))

    def sample(self, batch_size):
        batch = random.sample(self.buffer, batch_size)
        obs, actions, rewards, next_obs, dones = zip(*batch)
        return obs, actions, rewards, next_obs, dones

    def __len__(self):
        return len(self.buffer)


class MADDPGAgent:
    def __init__(self, agent_names, obs_dims, action_dims, lr_actor=1e-4, lr_critic=5e-4,
                 gamma=0.98, tau=0.01, hidden_dims=[256, 256]):
        self.agent_names = agent_names
        self.obs_dims = obs_dims
        self.action_dims = action_dims
        self.gamma = gamma
        self.tau = tau
        self.device = get_device()

        # Create networks for each agent
        self.actors = {}
        self.actor_targets = {}
        self.actor_opts = {}

        for a in agent_names:
            actor = Actor(obs_dims[a], action_dims[a], hidden_dims).to(self.device)
            self.actors[a] = actor
            self.actor_targets[a] = Actor(obs_dims[a], action_dims[a], hidden_dims).to(self.device)
            self.actor_targets[a].load_state_dict(actor.state_dict())
            self.actor_opts[a] = optim.Adam(actor.parameters(), lr=lr_actor)

        # Centralized critic
        total_obs = sum(obs_dims.values())
        total_act = sum(action_dims.values())
        self.critic = Critic(total_obs, total_act, hidden_dims).to(self.device)
        self.critic_target = Critic(total_obs, total_act, hidden_dims).to(self.device)
        self.critic_target.load_state_dict(self.critic.state_dict())
        self.critic_opt = optim.Adam(self.critic.parameters(), lr=lr_critic)

        self.noise_scale = 0.2
        self.noise_decay = 0.9995
        self.min_noise = 0.01

    def select_action(self, obs, add_noise=True):
        actions = {}
        for a in self.agent_names:
            o = torch.FloatTensor(obs[a]).unsqueeze(0).to(self.device)
            with torch.no_grad():
                action = self.actors[a](o).cpu().numpy()[0]
            if add_noise:
                noise = np.random.normal(0, self.noise_scale, size=action.shape)
                action = np.clip(action + noise, -1, 1)
            actions[a] = action
        return actions

    def decay_noise(self):
        self.noise_scale = max(self.min_noise, self.noise_scale * self.noise_decay)

    def update(self, batch):
        obs_batch, act_batch, rew_batch, next_obs_batch, done_batch = batch
        batch_size = len(obs_batch)

        obs_all = torch.FloatTensor(
            np.array([[obs_batch[i][a] for a in self.agent_names] for i in range(batch_size)])
        ).to(self.device)
        obs_all = obs_all.view(batch_size, -1)

        next_obs_all = torch.FloatTensor(
            np.array([[next_obs_batch[i][a] for a in self.agent_names] for i in range(batch_size)])
        ).to(self.device)
        next_obs_all = next_obs_all.view(batch_size, -1)

        acts_all = torch.FloatTensor(
            np.array([[act_batch[i][a] for a in self.agent_names] for i in range(batch_size)])
        ).to(self.device)
        acts_all = acts_all.view(batch_size, -1)

        rewards = torch.FloatTensor(
            np.array([np.mean([rew_batch[i][a] for a in self.agent_names]) for i in range(batch_size)])
        ).unsqueeze(1).to(self.device)

        dones = torch.FloatTensor(
            np.array([float(done_batch[i]) for i in range(batch_size)])
        ).unsqueeze(1).to(self.device)

        with torch.no_grad():
            next_acts = []
            for a in self.agent_names:
                idx = self.agent_names.index(a)
                o_dim = self.obs_dims[a]
                start = sum(self.obs_dims[self.agent_names[j]] for j in range(idx))
                o = next_obs_all[:, start:start+o_dim]
                next_acts.append(self.actor_targets[a](o))
            next_acts_all = torch.cat(next_acts, dim=-1)
            target_q = rewards + self.gamma * (1 - dones) * self.critic_target(next_obs_all, next_acts_all)

        current_q = self.critic(obs_all, acts_all)
        critic_loss = nn.MSELoss()(current_q, target_q)
        self.critic_opt.zero_grad()
        critic_loss.backward()
        nn.utils.clip_grad_norm_(self.critic.parameters(), 0.5)
        self.critic_opt.step()

        for a in self.agent_names:
            idx = self.agent_names.index(a)
            o_dim = self.obs_dims[a]
            start = sum(self.obs_dims[self.agent_names[j]] for j in range(idx))
            o = obs_all[:, start:start+o_dim]

            new_acts = []
            for a2 in self.agent_names:
                idx2 = self.agent_names.index(a2)
                o_dim2 = self.obs_dims[a2]
                start2 = sum(self.obs_dims[self.agent_names[j]] for j in range(idx2))
                o2 = obs_all[:, start2:start2+o_dim2]
                if a2 == a:
                    new_acts.append(self.actors[a](o2))
                else:
                    a_dim = self.action_dims[a2]
                    a_start = sum(self.action_dims[self.agent_names[j]] for j in range(idx2))
                    new_acts.append(acts_all[:, a_start:a_start+a_dim].detach())
            new_acts_all = torch.cat(new_acts, dim=-1)

            actor_loss = -self.critic(obs_all, new_acts_all).mean()
            self.actor_opts[a].zero_grad()
            actor_loss.backward()
            nn.utils.clip_grad_norm_(self.actors[a].parameters(), 0.5)
            self.actor_opts[a].step()

        self._soft_update()

    def _soft_update(self):
        for a in self.agent_names:
            for p, tp in zip(self.actors[a].parameters(), self.actor_targets[a].parameters()):
                tp.data.copy_(self.tau * p.data + (1 - self.tau) * tp.data)
        for p, tp in zip(self.critic.parameters(), self.critic_target.parameters()):
            tp.data.copy_(self.tau * p.data + (1 - self.tau) * tp.data)

    def save(self, path):
        ckpt = {
            'agent_names': self.agent_names,
            'obs_dims': self.obs_dims,
            'action_dims': self.action_dims,
            'critic': self.critic.state_dict(),
            'critic_target': self.critic_target.state_dict(),
        }
        for a in self.agent_names:
            ckpt[f'actor_{a}'] = self.actors[a].state_dict()
            ckpt[f'actor_target_{a}'] = self.actor_targets[a].state_dict()
        torch.save(ckpt, path)

    def load(self, path):
        ckpt = torch.load(path, map_location=self.device)
        self.critic.load_state_dict(ckpt['critic'])
        self.critic_target.load_state_dict(ckpt['critic_target'])
        for a in self.agent_names:
            self.actors[a].load_state_dict(ckpt[f'actor_{a}'])
            self.actor_targets[a].load_state_dict(ckpt[f'actor_target_{a}'])
