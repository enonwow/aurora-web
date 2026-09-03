void main()
{
    object oModule = GetModule();
    object oPC = GetFirstPC();
    if (!GetIsObjectValid(oPC) || GetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED"))
    {
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED", 1);
    AssignCommand(oPC, SetCameraFacing(180.0, 6.0, 48.0, CAMERA_TRANSITION_TYPE_SNAP));
    SetCameraHeight(oPC, 1.2);
    DelayCommand(1.0, AssignCommand(oPC, SetCameraFacing(180.0, 6.0, 48.0, CAMERA_TRANSITION_TYPE_SNAP)));
    DelayCommand(1.1, SetCameraHeight(oPC, 1.2));
    DelayCommand(18.0, ExecuteScript("vba0shot", oModule));
}
