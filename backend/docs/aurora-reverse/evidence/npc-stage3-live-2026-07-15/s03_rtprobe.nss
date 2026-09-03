void main()
{
    object oPC = GetFirstPC();
    if (!GetIsObjectValid(oPC) || GetLocalInt(OBJECT_SELF, "S03_PROBE_DONE"))
    {
        return;
    }

    int bInventory = FALSE;
    object oItem = GetFirstItemInInventory(OBJECT_SELF);
    while (GetIsObjectValid(oItem))
    {
        if (GetResRef(oItem) == "s03proofamuletr2")
        {
            bInventory = TRUE;
        }
        oItem = GetNextItemInInventory(OBJECT_SELF);
    }

    object oNeck = GetItemInSlot(INVENTORY_SLOT_NECK, OBJECT_SELF);
    object oWaypoint = GetWaypointByTag("CODEX_WAYPOINT_REDO2");

    if (bInventory)
    {
        DelayCommand(4.0, SendMessageToPC(oPC, "S03_INVENTORY_OK"));
    }

    if (GetIsObjectValid(oNeck) && GetResRef(oNeck) == "s03proofamuletr2")
    {
        DelayCommand(4.0, SendMessageToPC(oPC, "S03_EQUIPMENT_OK"));
    }

    if (GetIsObjectValid(oWaypoint))
    {
        DelayCommand(4.0, SendMessageToPC(oPC, "S03_WAYPOINT_OK"));
    }
    else
    {
        SendMessageToPC(oPC, "S03_WAYPOINT_FAIL");
    }

    SetLocalInt(OBJECT_SELF, "S03_PROBE_DONE", TRUE);
    DelayCommand(10.0, ActionStartConversation(oPC, "nw_hen_bod", TRUE));
}
