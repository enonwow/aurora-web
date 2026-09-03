void main()
{
    object oUser = GetLastUsedBy();
    SendMessageToPC(oUser, "S04_PLACEABLE_USED");
    FloatingTextStringOnCreature("S04_PLACEABLE_USED", oUser, FALSE);
    AssignCommand(OBJECT_SELF, ActionPlayAnimation(ANIMATION_PLACEABLE_ACTIVATE, 1.0, 1.0));
}
