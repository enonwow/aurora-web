void main()
{
    object oModule = GetModule();
    object oPC = GetFirstPC();
    if (!GetIsObjectValid(oPC) || GetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED"))
    {
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED", 1);
    AssignCommand(oPC, SetCameraFacing(90.0, 5.0, 55.0, CAMERA_TRANSITION_TYPE_SNAP));
    DelayCommand(20.0, ExecuteScript("vfx44shot", oModule));
}
