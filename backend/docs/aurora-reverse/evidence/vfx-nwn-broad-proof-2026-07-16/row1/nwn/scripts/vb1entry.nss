void main()
{
    object oModule = GetModule();
    object oPC = GetFirstPC();
    if (!GetIsObjectValid(oPC) || GetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED"))
    {
        return;
    }

    SetLocalInt(oModule, "AURORA_VFX_PROOF_SCHEDULED", 1);
    AssignCommand(oPC, SetCameraFacing(90.0, 5.8, 55.0, CAMERA_TRANSITION_TYPE_SNAP));
    SetCameraHeight(oPC, 1.1);
    DelayCommand(1.0, AssignCommand(oPC, SetCameraFacing(90.0, 5.8, 55.0, CAMERA_TRANSITION_TYPE_SNAP)));
    DelayCommand(1.1, SetCameraHeight(oPC, 1.1));
    DelayCommand(18.0, ExecuteScript("vb1shot", oModule));
}
