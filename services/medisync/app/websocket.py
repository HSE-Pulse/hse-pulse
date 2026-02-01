"""
WebSocket endpoint for live DES metrics streaming.

    WS /stream/metrics
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.schemas import SimState

logger = logging.getLogger("medisync.websocket")

router = APIRouter()


@router.websocket("/stream/metrics")
async def stream_metrics(ws: WebSocket):
    mgr = ws.app.state.sim_manager
    await ws.accept()
    mgr.subscribe_metrics(ws)
    mgr.subscribe(ws)
    logger.info(
        "Metrics WS client connected. metrics=%d, standard=%d",
        len(mgr.metrics_subscribers),
        len(mgr.subscribers),
    )

    try:
        await ws.send_json({"type": "status", "data": mgr.get_status()})

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
                await ws.send_json({
                    "type": "ack",
                    "data": {"action": "play", "state": mgr.state.value},
                })

            elif msg_type == "pause":
                if mgr.state == SimState.RUNNING:
                    mgr.pause()
                await ws.send_json({
                    "type": "ack",
                    "data": {"action": "pause", "state": mgr.state.value},
                })

            elif msg_type == "speed":
                mgr.set_speed(int(msg.get("value", 2)))
                await ws.send_json({
                    "type": "ack",
                    "data": {"action": "speed", "speed": mgr.speed},
                })

            elif msg_type == "step":
                if mgr.state in (SimState.PAUSED, SimState.IDLE):
                    snapshot = await mgr.step_forward()
                    if snapshot is None:
                        await ws.send_json({
                            "type": "error",
                            "data": "Cannot step: env not initialised.",
                        })
                else:
                    await ws.send_json({
                        "type": "error",
                        "data": "Can only step when paused or idle.",
                    })

            elif msg_type == "status":
                await ws.send_json({"type": "status", "data": mgr.get_status()})

            elif msg_type == "history":
                window = int(msg.get("window", 12))
                history = mgr.get_metrics_history(window=window)
                await ws.send_json({
                    "type": "history",
                    "data": history.model_dump(),
                })

            else:
                await ws.send_json({
                    "type": "error",
                    "data": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        logger.info("Metrics WS client disconnected.")
    except Exception:
        logger.exception("Metrics WS error")
    finally:
        mgr.unsubscribe_metrics(ws)
        mgr.unsubscribe(ws)
        logger.info(
            "Metrics WS client removed. metrics=%d, standard=%d",
            len(mgr.metrics_subscribers),
            len(mgr.subscribers),
        )
