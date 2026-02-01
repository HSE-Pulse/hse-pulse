from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.schemas import SimState

logger = logging.getLogger("medisync.ws")

router = APIRouter()


@router.websocket("/ws/simulation")
async def simulation_ws(ws: WebSocket):
    mgr = ws.app.state.sim_manager
    await ws.accept()
    mgr.subscribe(ws)
    logger.info("WebSocket client connected. Total subscribers: %d", len(mgr.subscribers))

    try:
        # Send current state on connect
        status = mgr.get_status()
        await ws.send_json({"type": "status", "data": status})

        # Listen for client commands
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "data": "Invalid JSON"})
                continue

            msg_type = msg.get("type", "")

            if msg_type == "play":
                if mgr.state == SimState.PAUSED:
                    mgr.resume()
                    await ws.send_json({"type": "ack", "data": {"action": "play", "state": mgr.state.value}})
                elif mgr.state == SimState.IDLE:
                    await ws.send_json({"type": "error", "data": "Simulation not started. Use POST /sim/start."})
                else:
                    await ws.send_json({"type": "ack", "data": {"action": "play", "state": mgr.state.value}})

            elif msg_type == "pause":
                if mgr.state == SimState.RUNNING:
                    mgr.pause()
                await ws.send_json({"type": "ack", "data": {"action": "pause", "state": mgr.state.value}})

            elif msg_type == "speed":
                value = msg.get("value", 2)
                mgr.set_speed(int(value))
                await ws.send_json({"type": "ack", "data": {"action": "speed", "speed": mgr.speed}})

            elif msg_type == "step":
                if mgr.state in (SimState.PAUSED, SimState.IDLE):
                    snapshot = await mgr.step_forward()
                    if snapshot:
                        await ws.send_json({"type": "tick", "data": snapshot.model_dump()})
                    else:
                        await ws.send_json({"type": "error", "data": "Cannot step: env not initialised."})
                else:
                    await ws.send_json({"type": "error", "data": "Can only step when paused or idle."})

            elif msg_type == "status":
                await ws.send_json({"type": "status", "data": mgr.get_status()})

            else:
                await ws.send_json({"type": "error", "data": f"Unknown message type: {msg_type}"})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception:
        logger.exception("WebSocket error")
    finally:
        mgr.unsubscribe(ws)
        logger.info("WebSocket client removed. Total subscribers: %d", len(mgr.subscribers))
