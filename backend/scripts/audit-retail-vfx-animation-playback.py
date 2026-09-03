#!/usr/bin/env python3
"""Recover the retail client VFX source-animation playback-rate branch.

This is a read-only, exact-build audit. It reuses the repository PE/Capstone
helpers and emits a bounded JSON artifact; it never starts or controls NWN.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import struct
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BINARY = Path(
    r"C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe"
)
DEFAULT_OUTPUT = REPO_ROOT / (
    "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/"
    "calibration-v18-client-animation-rate/client-animation-playback-audit.json"
)
EXPECTED_SHA256 = "3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a"
RETAIL_BASE = 0x140000000


def load_audit_helpers():
    helper_path = REPO_ROOT / "backend/scripts/audit-retail-light-function-disasm.py"
    spec = importlib.util.spec_from_file_location("aurora_retail_pe_helpers", helper_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot_load_pe_helpers:{helper_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, helper_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--binary", type=Path, default=DEFAULT_BINARY)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--source-row-id", type=int, default=28)
    return parser.parse_args()


def rebase(image, va: int) -> int:
    return image.image_base + (va - RETAIL_BASE)


def instruction_map(helpers, image, function_va: int):
    begin, end, instructions, range_source = helpers.disassemble_function_by_va(
        image, rebase(image, function_va)
    )
    return {
        "begin": begin,
        "end": end,
        "rangeSource": range_source,
        "instructions": {instruction.address: instruction for instruction in instructions},
    }


def require_instruction(function, image, va: int, mnemonic: str, fragments: tuple[str, ...]):
    address = rebase(image, va)
    instruction = function["instructions"].get(address)
    if instruction is None:
        raise RuntimeError(f"missing_instruction:{hex(address)}")
    if instruction.mnemonic != mnemonic or any(
        fragment not in instruction.op_str for fragment in fragments
    ):
        raise RuntimeError(
            f"instruction_mismatch:{hex(address)}:{instruction.mnemonic} {instruction.op_str}"
        )
    return instruction


def rip_target(instruction) -> int:
    for operand in instruction.operands:
        if operand.type == 3 and instruction.reg_name(operand.mem.base) == "rip":
            return instruction.address + instruction.size + int(operand.mem.disp)
    raise RuntimeError(f"rip_target_missing:{hex(instruction.address)}")


def read_float32(helpers, image, va: int) -> float:
    raw = helpers.read_bytes_va(image, va, 4)
    if raw is None or len(raw) != 4:
        raise RuntimeError(f"float_read_failed:{hex(va)}")
    return struct.unpack("<f", raw)[0]


def main() -> None:
    args = parse_args()
    binary = args.binary.resolve()
    output = args.output.resolve()
    binary_bytes = binary.read_bytes()
    binary_sha256 = hashlib.sha256(binary_bytes).hexdigest()
    if binary_sha256 != EXPECTED_SHA256:
        raise RuntimeError(
            f"unsupported_retail_binary:{binary_sha256}:expected:{EXPECTED_SHA256}"
        )

    helpers, helper_path = load_audit_helpers()
    image = helpers.PeImage(binary)
    visual_effect_loader = instruction_map(helpers, image, 0x140872770)
    duration_dispatch = instruction_map(helpers, image, 0x140873160)
    anim_base_constructor = instruction_map(helpers, image, 0x1409B2A20)
    play_animation = instruction_map(helpers, image, 0x1409B2F30)

    source_row_input = require_instruction(
        visual_effect_loader, image, 0x140872795, "mov", ("esi", "edx")
    )
    source_row_store = require_instruction(
        visual_effect_loader,
        image,
        0x140872F36,
        "mov",
        ("[r15 + 0x180]", "esi"),
    )
    source_row_branch = require_instruction(
        duration_dispatch,
        image,
        0x1408731AE,
        "cmp",
        ("[rcx + 0x180]", "0x28"),
    )
    exceptional_rate_load = require_instruction(
        duration_dispatch, image, 0x1408731B7, "movss", ("xmm7", "rip")
    )
    default_rate_load = require_instruction(
        duration_dispatch, image, 0x1408731C1, "movss", ("xmm7", "rip")
    )
    exceptional_rate_va = rip_target(exceptional_rate_load)
    default_rate_va = rip_target(default_rate_load)
    exceptional_rate = read_float32(helpers, image, exceptional_rate_va)
    default_rate = read_float32(helpers, image, default_rate_va)
    if abs(exceptional_rate - 0.8) > 1e-6 or default_rate != 1.0:
        raise RuntimeError(
            f"playback_rate_constants_drifted:{exceptional_rate}:{default_rate}"
        )

    constructor_vtable_load = require_instruction(
        anim_base_constructor, image, 0x1409B2A2E, "lea", ("rax", "rip")
    )
    anim_base_vtable_va = rip_target(constructor_vtable_load)
    play_animation_function_va = helpers.read_u64_va(image, anim_base_vtable_va + 0x80)
    if play_animation_function_va != rebase(image, 0x1409B2F30):
        raise RuntimeError(
            "anim_base_play_slot_drifted:"
            f"{hex(play_animation_function_va or 0)}"
        )
    require_instruction(
        play_animation, image, 0x1409B2F57, "movaps", ("xmm6", "xmm2")
    )
    aur_object_dispatch = require_instruction(
        play_animation, image, 0x1409B3001, "call", ("[rax + 0x30]",)
    )

    animation_calls = []
    for address in (0x140873318, 0x140873490, 0x1408735D1):
        instruction = require_instruction(
            duration_dispatch, image, address, "call", ("[rax + 0x80]",)
        )
        animation_calls.append(
            {
                "at": hex(instruction.address),
                "instruction": f"{instruction.mnemonic} {instruction.op_str}",
                "rateRegister": "xmm2",
                "rateSourceRegister": "xmm7",
            }
        )

    exceptional_source_row_id = 0x28
    target_rate = (
        exceptional_rate
        if args.source_row_id == exceptional_source_row_id
        else default_rate
    )
    report = {
        "version": "aurora-retail-vfx-animation-playback-audit/v1",
        "binary": {
            "path": str(binary).replace("\\", "/"),
            "sizeBytes": len(binary_bytes),
            "sha256": binary_sha256,
            "imageBase": hex(image.image_base),
        },
        "toolchain": {
            "script": str(Path(__file__).resolve()).replace("\\", "/"),
            "peDisassemblyHelpers": str(helper_path.resolve()).replace("\\", "/"),
            "mode": "read-only-pdata-capstone-exact-address-audit",
        },
        "sourceRowTransport": {
            "loadVisualEffectFunctionVa": hex(visual_effect_loader["begin"]),
            "inputRegister": "edx",
            "inputMoveAt": hex(source_row_input.address),
            "storageOffset": "0x180",
            "storageMoveAt": hex(source_row_store.address),
            "finding": "LoadVisualEffect preserves its numeric source-row argument at CNWCVisualEffect+0x180.",
        },
        "animationDispatch": {
            "animBaseConstructorVa": hex(anim_base_constructor["begin"]),
            "animBaseVtableVa": hex(anim_base_vtable_va),
            "wrapperVtableSlot": "0x80",
            "playAnimationFunctionVa": hex(play_animation_function_va),
            "aurObjectDispatchSlot": "0x30",
            "aurObjectDispatchAt": hex(aur_object_dispatch.address),
            "visualEffectCallSites": animation_calls,
        },
        "playbackRateEvidence": {
            "sourceRowCompareAt": hex(source_row_branch.address),
            "exceptionalRateLoadAt": hex(exceptional_rate_load.address),
            "exceptionalRateConstantVa": hex(exceptional_rate_va),
            "defaultRateLoadAt": hex(default_rate_load.address),
            "defaultRateConstantVa": hex(default_rate_va),
            "rateRegisterAtDispatch": "xmm2",
        },
        "playbackRateBranch": {
            "sourceRowOffset": "0x180",
            "exceptionalSourceRowId": exceptional_source_row_id,
            "exceptionalRate": exceptional_rate,
            "defaultRate": default_rate,
            "targetSourceRowId": args.source_row_id,
            "targetRate": target_rate,
        },
        "implementationBoundary": {
            "allowed": "Use the recovered source-animation rate as source/runtime contract data.",
            "forbidden": "Do not add a frontend/backend behavior branch keyed by VFX id, label, resref, filename, node name, or another asset identity.",
            "targetProfileUse": "The row28 proof must replay source animation at 1.0; endpoint image fitting cannot override this recovered rate.",
        },
        "proofStatus": (
            "source-backed-retail-client-row28-animation-playback-rate-1"
            if args.source_row_id == 28 and target_rate == 1.0
            else "source-backed-retail-client-animation-playback-rate-recovered"
        ),
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise RuntimeError(f"immutable_audit_output_exists:{output}")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "ok", "output": str(output), "targetRate": target_rate}))


if __name__ == "__main__":
    main()
