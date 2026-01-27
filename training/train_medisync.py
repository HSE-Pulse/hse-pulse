"""
MediSync Model Training Script with MLflow Integration
MADDPG-based multi-agent RL for hospital resource allocation
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime
from typing import List, Dict, Any, Tuple
from collections import deque
import random

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.optim import Adam

try:
    import mlflow
    import mlflow.pytorch
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    print("MLflow not available. Install with: pip install mlflow")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Actor(nn.Module):
    """Actor network for MADDPG."""

    def __init__(self, state_dim: int, action_dim: int, hidden_dim: int = 256):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, action_dim),
            nn.Softmax(dim=-1)
        )

    def forward(self, state: torch.Tensor) -> torch.Tensor:
        return self.net(state)


class Critic(nn.Module):
    """Critic network for MADDPG."""

    def __init__(self, full_state_dim: int, full_action_dim: int, hidden_dim: int = 256):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(full_state_dim + full_action_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1)
        )

    def forward(self, state: torch.Tensor, action: torch.Tensor) -> torch.Tensor:
        x = torch.cat([state, action], dim=-1)
        return self.net(x)


class MADDPGAgent:
    """MADDPG Agent for each department."""

    def __init__(
        self,
        name: str,
        state_dim: int,
        action_dim: int,
        full_state_dim: int,
        full_action_dim: int,
        device: torch.device,
        lr_actor: float = 1e-4,
        lr_critic: float = 1e-3,
        gamma: float = 0.95,
        tau: float = 0.01
    ):
        self.name = name
        self.device = device
        self.gamma = gamma
        self.tau = tau

        # Networks
        self.actor = Actor(state_dim, action_dim).to(device)
        self.actor_target = Actor(state_dim, action_dim).to(device)
        self.critic = Critic(full_state_dim, full_action_dim).to(device)
        self.critic_target = Critic(full_state_dim, full_action_dim).to(device)

        # Copy weights to target networks
        self.actor_target.load_state_dict(self.actor.state_dict())
        self.critic_target.load_state_dict(self.critic.state_dict())

        # Optimizers
        self.actor_optimizer = Adam(self.actor.parameters(), lr=lr_actor)
        self.critic_optimizer = Adam(self.critic.parameters(), lr=lr_critic)

    def select_action(self, state: np.ndarray, explore: bool = True) -> np.ndarray:
        """Select action with optional exploration noise."""
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        with torch.no_grad():
            action = self.actor(state_tensor).cpu().numpy()[0]

        if explore:
            noise = np.random.dirichlet(np.ones(len(action)) * 0.5)
            action = 0.7 * action + 0.3 * noise

        return action

    def soft_update(self):
        """Soft update target networks."""
        for target_param, param in zip(self.actor_target.parameters(), self.actor.parameters()):
            target_param.data.copy_(self.tau * param.data + (1.0 - self.tau) * target_param.data)
        for target_param, param in zip(self.critic_target.parameters(), self.critic.parameters()):
            target_param.data.copy_(self.tau * param.data + (1.0 - self.tau) * target_param.data)


class ReplayBuffer:
    """Experience replay buffer for MADDPG."""

    def __init__(self, capacity: int = 100000):
        self.buffer = deque(maxlen=capacity)

    def push(self, states, actions, rewards, next_states, dones):
        self.buffer.append((states, actions, rewards, next_states, dones))

    def sample(self, batch_size: int):
        batch = random.sample(self.buffer, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)
        return (
            np.array(states),
            np.array(actions),
            np.array(rewards),
            np.array(next_states),
            np.array(dones)
        )

    def __len__(self):
        return len(self.buffer)


class HospitalEnvironment:
    """Simulated hospital environment for RL training."""

    def __init__(self, departments: List[str]):
        self.departments = departments
        self.n_agents = len(departments)
        self.state_dim = 5  # Per agent
        self.action_dim = 5  # Allocation levels

        self.reset()

    def reset(self) -> np.ndarray:
        """Reset environment to initial state."""
        self.states = {}
        for dept in self.departments:
            self.states[dept] = {
                'current_patients': np.random.randint(10, 50),
                'available_beds': np.random.randint(20, 50),
                'staff_on_duty': np.random.randint(5, 20),
                'incoming_rate': np.random.uniform(2, 10),
                'severity_index': np.random.uniform(0.3, 0.8)
            }
        return self._get_observations()

    def _get_observations(self) -> List[np.ndarray]:
        """Get observation for each agent."""
        observations = []
        for dept in self.departments:
            state = self.states[dept]
            obs = np.array([
                state['current_patients'] / 100,
                state['available_beds'] / 50,
                state['staff_on_duty'] / 20,
                state['incoming_rate'] / 10,
                state['severity_index']
            ], dtype=np.float32)
            observations.append(obs)
        return observations

    def step(self, actions: List[np.ndarray]) -> Tuple[List[np.ndarray], List[float], List[bool], Dict]:
        """Execute actions and return results."""
        rewards = []
        dones = []
        info = {}

        for i, (dept, action) in enumerate(zip(self.departments, actions)):
            # Get allocation level (0-4)
            allocation_level = np.argmax(action)
            multipliers = [0.8, 0.9, 1.0, 1.1, 1.2]
            mult = multipliers[allocation_level]

            state = self.states[dept]

            # Update state based on allocation
            new_patients = int(state['incoming_rate'] * np.random.uniform(0.8, 1.2))
            discharged = int(state['current_patients'] * 0.1 * mult)

            state['current_patients'] = max(0, state['current_patients'] + new_patients - discharged)
            state['incoming_rate'] *= np.random.uniform(0.95, 1.05)
            state['severity_index'] = np.clip(state['severity_index'] + np.random.uniform(-0.1, 0.1), 0.1, 0.9)

            # Calculate reward
            occupancy = state['current_patients'] / max(state['available_beds'], 1)
            staffing_ratio = state['staff_on_duty'] / max(state['current_patients'], 1)

            # Reward: balance occupancy (avoid over/under) and good staffing
            occupancy_reward = -abs(occupancy - 0.75)  # Target 75% occupancy
            staffing_reward = min(staffing_ratio * 0.5, 1.0)  # Reward adequate staffing
            efficiency_reward = discharged * 0.1  # Reward patient throughput

            reward = occupancy_reward + staffing_reward + efficiency_reward
            rewards.append(reward)
            dones.append(False)

        next_observations = self._get_observations()
        return next_observations, rewards, dones, info


class MADDPGTrainer:
    """MADDPG training coordinator."""

    def __init__(
        self,
        departments: List[str],
        device: torch.device,
        lr_actor: float = 1e-4,
        lr_critic: float = 1e-3,
        gamma: float = 0.95,
        tau: float = 0.01,
        batch_size: int = 64
    ):
        self.departments = departments
        self.n_agents = len(departments)
        self.device = device
        self.batch_size = batch_size

        # Environment
        self.env = HospitalEnvironment(departments)

        # Calculate dimensions
        self.state_dim = self.env.state_dim
        self.action_dim = self.env.action_dim
        self.full_state_dim = self.state_dim * self.n_agents
        self.full_action_dim = self.action_dim * self.n_agents

        # Create agents
        self.agents = {}
        for dept in departments:
            self.agents[dept] = MADDPGAgent(
                name=dept,
                state_dim=self.state_dim,
                action_dim=self.action_dim,
                full_state_dim=self.full_state_dim,
                full_action_dim=self.full_action_dim,
                device=device,
                lr_actor=lr_actor,
                lr_critic=lr_critic,
                gamma=gamma,
                tau=tau
            )

        # Replay buffer
        self.replay_buffer = ReplayBuffer()

    def train_step(self) -> Dict[str, float]:
        """Perform one training step."""
        if len(self.replay_buffer) < self.batch_size:
            return {}

        # Sample batch
        states, actions, rewards, next_states, dones = self.replay_buffer.sample(self.batch_size)

        # Convert to tensors
        states = torch.FloatTensor(states).to(self.device)
        actions = torch.FloatTensor(actions).to(self.device)
        rewards = torch.FloatTensor(rewards).to(self.device)
        next_states = torch.FloatTensor(next_states).to(self.device)
        dones = torch.FloatTensor(dones).to(self.device)

        metrics = {}

        for i, dept in enumerate(self.departments):
            agent = self.agents[dept]

            # Get current agent's data
            agent_state = states[:, i]
            agent_next_state = next_states[:, i]
            agent_reward = rewards[:, i].unsqueeze(1)
            agent_done = dones[:, i].unsqueeze(1)

            # Flatten states and actions for critic
            full_state = states.view(self.batch_size, -1)
            full_action = actions.view(self.batch_size, -1)
            full_next_state = next_states.view(self.batch_size, -1)

            # Get next actions from all agents (for target critic)
            next_actions = []
            for j, d in enumerate(self.departments):
                next_actions.append(self.agents[d].actor_target(next_states[:, j]))
            full_next_action = torch.cat(next_actions, dim=-1)

            # Update Critic
            with torch.no_grad():
                target_q = agent.critic_target(full_next_state, full_next_action)
                target_q = agent_reward + agent.gamma * target_q * (1 - agent_done)

            current_q = agent.critic(full_state, full_action)
            critic_loss = F.mse_loss(current_q, target_q)

            agent.critic_optimizer.zero_grad()
            critic_loss.backward()
            agent.critic_optimizer.step()

            # Update Actor
            current_actions = []
            for j, d in enumerate(self.departments):
                if d == dept:
                    current_actions.append(agent.actor(states[:, j]))
                else:
                    current_actions.append(actions[:, j])
            current_full_action = torch.cat(current_actions, dim=-1)

            actor_loss = -agent.critic(full_state, current_full_action).mean()

            agent.actor_optimizer.zero_grad()
            actor_loss.backward()
            agent.actor_optimizer.step()

            # Soft update
            agent.soft_update()

            metrics[f'{dept}_critic_loss'] = critic_loss.item()
            metrics[f'{dept}_actor_loss'] = actor_loss.item()

        return metrics

    def collect_episode(self, max_steps: int = 100) -> float:
        """Collect one episode of experience."""
        observations = self.env.reset()
        total_reward = 0

        for _ in range(max_steps):
            # Select actions
            actions = []
            for i, dept in enumerate(self.departments):
                action = self.agents[dept].select_action(observations[i], explore=True)
                actions.append(action)

            # Step environment
            next_observations, rewards, dones, _ = self.env.step(actions)
            total_reward += sum(rewards)

            # Store transition
            self.replay_buffer.push(
                np.array(observations),
                np.array(actions),
                np.array(rewards),
                np.array(next_observations),
                np.array(dones)
            )

            observations = next_observations

            if any(dones):
                break

        return total_reward

    def evaluate(self, n_episodes: int = 10) -> Dict[str, float]:
        """Evaluate current policy."""
        total_rewards = []
        metrics_per_dept = {dept: [] for dept in self.departments}

        for _ in range(n_episodes):
            observations = self.env.reset()
            episode_reward = 0

            for _ in range(100):
                actions = []
                for i, dept in enumerate(self.departments):
                    action = self.agents[dept].select_action(observations[i], explore=False)
                    actions.append(action)

                next_observations, rewards, dones, _ = self.env.step(actions)
                episode_reward += sum(rewards)

                for i, dept in enumerate(self.departments):
                    metrics_per_dept[dept].append(rewards[i])

                observations = next_observations
                if any(dones):
                    break

            total_rewards.append(episode_reward)

        return {
            'mean_reward': np.mean(total_rewards),
            'std_reward': np.std(total_rewards),
            **{f'{dept}_avg_reward': np.mean(metrics_per_dept[dept]) for dept in self.departments}
        }

    def get_checkpoint(self) -> Dict[str, Any]:
        """Get model checkpoint."""
        checkpoint = {}
        for dept in self.departments:
            checkpoint[dept] = self.agents[dept].actor.state_dict()
        return checkpoint


def main():
    parser = argparse.ArgumentParser(description='Train MediSync MADDPG model')
    parser.add_argument('--episodes', type=int, default=500, help='Number of training episodes')
    parser.add_argument('--batch-size', type=int, default=64, help='Batch size')
    parser.add_argument('--lr-actor', type=float, default=1e-4, help='Actor learning rate')
    parser.add_argument('--lr-critic', type=float, default=1e-3, help='Critic learning rate')
    parser.add_argument('--gamma', type=float, default=0.95, help='Discount factor')
    parser.add_argument('--tau', type=float, default=0.01, help='Soft update parameter')
    parser.add_argument('--output-dir', type=str, default='../models/medisync', help='Output directory')
    parser.add_argument('--mlflow-uri', type=str, default='http://localhost:5000', help='MLflow tracking URI')
    parser.add_argument('--experiment-name', type=str, default='MediSync-MADDPG', help='MLflow experiment name')
    args = parser.parse_args()

    # Setup device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")

    # Setup MLflow
    if MLFLOW_AVAILABLE:
        mlflow.set_tracking_uri(args.mlflow_uri)
        mlflow.set_experiment(args.experiment_name)
        logger.info(f"MLflow tracking URI: {args.mlflow_uri}")

    # Departments
    departments = ["Emergency", "ICU", "Surgery", "General Ward"]

    # Create trainer
    trainer = MADDPGTrainer(
        departments=departments,
        device=device,
        lr_actor=args.lr_actor,
        lr_critic=args.lr_critic,
        gamma=args.gamma,
        tau=args.tau,
        batch_size=args.batch_size
    )

    # Start MLflow run
    run_name = f"medisync-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    with mlflow.start_run(run_name=run_name) if MLFLOW_AVAILABLE else nullcontext():
        # Log parameters
        if MLFLOW_AVAILABLE:
            mlflow.log_params({
                'episodes': args.episodes,
                'batch_size': args.batch_size,
                'lr_actor': args.lr_actor,
                'lr_critic': args.lr_critic,
                'gamma': args.gamma,
                'tau': args.tau,
                'n_agents': len(departments),
                'model_type': 'MADDPG'
            })

        # Training loop
        logger.info("Starting MADDPG training...")
        best_reward = float('-inf')
        training_history = {'episode_rewards': [], 'eval_rewards': []}

        for episode in range(args.episodes):
            # Collect experience
            episode_reward = trainer.collect_episode()
            training_history['episode_rewards'].append(episode_reward)

            # Train
            train_metrics = trainer.train_step()

            # Log training metrics
            if MLFLOW_AVAILABLE and train_metrics:
                mlflow.log_metrics(train_metrics, step=episode)
                mlflow.log_metric('episode_reward', episode_reward, step=episode)

            # Evaluate periodically
            if (episode + 1) % 50 == 0:
                eval_metrics = trainer.evaluate()
                training_history['eval_rewards'].append(eval_metrics['mean_reward'])

                logger.info(
                    f"Episode {episode+1}/{args.episodes} - "
                    f"Episode Reward: {episode_reward:.2f}, "
                    f"Eval Mean: {eval_metrics['mean_reward']:.2f}"
                )

                if MLFLOW_AVAILABLE:
                    mlflow.log_metrics({
                        'eval_mean_reward': eval_metrics['mean_reward'],
                        'eval_std_reward': eval_metrics['std_reward']
                    }, step=episode)

                if eval_metrics['mean_reward'] > best_reward:
                    best_reward = eval_metrics['mean_reward']

        # Final evaluation
        final_metrics = trainer.evaluate(n_episodes=20)
        logger.info(f"Final evaluation: {final_metrics}")

        if MLFLOW_AVAILABLE:
            mlflow.log_metrics({
                'final_mean_reward': final_metrics['mean_reward'],
                'final_std_reward': final_metrics['std_reward'],
                'best_eval_reward': best_reward
            })

        # Save model
        os.makedirs(args.output_dir, exist_ok=True)
        model_path = os.path.join(args.output_dir, 'maddpg_checkpoint.pth')

        checkpoint = trainer.get_checkpoint()
        checkpoint['metadata'] = {
            'departments': departments,
            'state_dim': trainer.state_dim,
            'action_dim': trainer.action_dim,
            'training_episodes': args.episodes
        }
        torch.save(checkpoint, model_path)
        logger.info(f"Model saved to {model_path}")

        # Log to MLflow
        if MLFLOW_AVAILABLE:
            mlflow.log_artifact(model_path)

            # Log agents individually
            for dept, agent in trainer.agents.items():
                mlflow.pytorch.log_model(agent.actor, f"actor_{dept.replace(' ', '_')}")

        logger.info(f"Training complete. Best reward: {best_reward:.2f}")

        return {
            'best_reward': best_reward,
            'final_metrics': final_metrics,
            'training_episodes': args.episodes
        }


class nullcontext:
    """Null context manager for Python < 3.7 compatibility."""
    def __enter__(self):
        return None
    def __exit__(self, *args):
        return False


if __name__ == '__main__':
    main()
