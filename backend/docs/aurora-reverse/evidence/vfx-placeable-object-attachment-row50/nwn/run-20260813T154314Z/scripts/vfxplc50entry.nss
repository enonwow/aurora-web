void main()
{
    object oModule = GetModule();
    object oPC = GetFirstPC();
    if (!GetIsObjectValid(oPC) || GetLocalInt(oModule, "AURORA_VFX_PLACEABLE_SCHEDULED"))
    {
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PLACEABLE_SCHEDULED", 1);
    location lSource = Location(GetArea(oPC), Vector(12.5, 3.8, 0.0), 0.0);
    location lTarget = Location(GetArea(oPC), Vector(12.5, 6.8, 0.0), 180.0);
    AssignCommand(oPC, ClearAllActions(TRUE));
    AssignCommand(oPC, ActionJumpToLocation(lSource));

    object oTarget = CreateObject(
        OBJECT_TYPE_PLACEABLE,
        "vfxplcproof",
        lTarget,
        FALSE,
        "vfx_placeable_target"
    );
    if (!GetIsObjectValid(oTarget))
    {
        WriteTimestampedLogEntry("AURORA_VFX_PROOF_PRECONDITION_FAILED fixture=vfx-broad-row50-placeable reason=placeable-create-failed run=20260813T154314Z");
        return;
    }
    SetLocalObject(oModule, "AURORA_VFX_PLACEABLE_TARGET", oTarget);
    WriteTimestampedLogEntry("AURORA_VFX_PROOF_TARGET_CREATED fixture=vfx-broad-row50-placeable tag=vfx_placeable_target count=1 run=20260813T154314Z");

    DelayCommand(0.5, AssignCommand(oPC, SetFacingPoint(GetPosition(oTarget))));
    AssignCommand(oPC, SetCameraFacing(90.0, 5.8, 55.0, CAMERA_TRANSITION_TYPE_SNAP));
    SetCameraHeight(oPC, 1.1);
    DelayCommand(1.0, AssignCommand(oPC, SetCameraFacing(90.0, 5.8, 55.0, CAMERA_TRANSITION_TYPE_SNAP)));
    DelayCommand(1.1, SetCameraHeight(oPC, 1.1));
    DelayCommand(18.0, ExecuteScript("vfxplc50shot", oModule));
}
