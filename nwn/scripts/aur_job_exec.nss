#include "nwnx_object"
#include "aur_job_inc"

void AUR_Complete(string sJobId, string sMessage)
{
    AUR_Log("Job " + sJobId + " completed: " + sMessage);
    AUR_WriteJobResult(sJobId, "completed", sMessage);
}

void AUR_Fail(string sJobId, string sMessage)
{
    AUR_Log("Job " + sJobId + " failed: " + sMessage);
    AUR_WriteJobResult(sJobId, "failed", sMessage);
}

void AUR_HandleCreateObject(string sJobId, string sPayload)
{
    string sObjectType = AUR_GetParam(sPayload, "objectType", "placeable");
    string sResref = AUR_GetParam(sPayload, "resref", "");
    string sTag = AUR_GetParam(sPayload, "tag", "");
    string sAreaTag = AUR_GetParam(sPayload, "areaTag", "");

    float fX = StringToFloat(AUR_GetParam(sPayload, "x", "0.0"));
    float fY = StringToFloat(AUR_GetParam(sPayload, "y", "0.0"));
    float fZ = StringToFloat(AUR_GetParam(sPayload, "z", "0.0"));
    float fFacing = StringToFloat(AUR_GetParam(sPayload, "facing", "0.0"));

    if (GetStringLength(sResref) == 0)
    {
        AUR_Fail(sJobId, "Missing resref.");
        return;
    }

    int nObjectType = AUR_ParseObjectType(sObjectType);
    if (nObjectType < 0)
    {
        AUR_Fail(sJobId, "Unsupported objectType: " + sObjectType);
        return;
    }

    object oArea = AUR_FindAreaByTag(sAreaTag);
    if (!GetIsObjectValid(oArea))
    {
        AUR_Fail(sJobId, "Area not found: " + sAreaTag);
        return;
    }

    location lSpawn = Location(oArea, Vector(fX, fY, fZ), fFacing);
    object oCreated = CreateObject(nObjectType, sResref, lSpawn, FALSE, sTag);
    if (!GetIsObjectValid(oCreated))
    {
        AUR_Fail(sJobId, "CreateObject failed.");
        return;
    }

    string sFinalTag = GetTag(oCreated);
    AUR_Complete(sJobId, "Created object tag=" + sFinalTag + " resref=" + sResref);
}

void AUR_HandleMoveObject(string sJobId, string sPayload)
{
    string sTag = AUR_GetParam(sPayload, "tag", "");
    string sAreaTag = AUR_GetParam(sPayload, "areaTag", "");
    float fX = StringToFloat(AUR_GetParam(sPayload, "x", "0.0"));
    float fY = StringToFloat(AUR_GetParam(sPayload, "y", "0.0"));
    float fZ = StringToFloat(AUR_GetParam(sPayload, "z", "0.0"));
    float fFacing = StringToFloat(AUR_GetParam(sPayload, "facing", "0.0"));

    object oTarget = AUR_FindObjectByTag(sTag);
    if (!GetIsObjectValid(oTarget))
    {
        AUR_Fail(sJobId, "Object not found: " + sTag);
        return;
    }

    vector vTarget = Vector(fX, fY, fZ);
    object oArea = OBJECT_INVALID;
    if (GetStringLength(sAreaTag) > 0)
    {
        oArea = AUR_FindAreaByTag(sAreaTag);
    }

    if (GetIsObjectValid(oArea) && GetArea(oTarget) != oArea)
    {
        NWNX_Object_AddToArea(oTarget, oArea, vTarget);
    }
    else
    {
        NWNX_Object_SetPosition(oTarget, vTarget, TRUE);
    }

    if (GetObjectType(oTarget) == OBJECT_TYPE_CREATURE)
    {
        AssignCommand(oTarget, SetFacing(fFacing));
    }

    AUR_Complete(sJobId, "Moved object tag=" + sTag);
}

void AUR_HandleDestroyObject(string sJobId, string sPayload)
{
    string sTag = AUR_GetParam(sPayload, "tag", "");
    object oTarget = AUR_FindObjectByTag(sTag);

    if (!GetIsObjectValid(oTarget))
    {
        AUR_Fail(sJobId, "Object not found: " + sTag);
        return;
    }

    DestroyObject(oTarget, 0.0);
    AUR_Complete(sJobId, "Destroyed object tag=" + sTag);
}

void AUR_HandleSetLocalInt(string sJobId, string sPayload)
{
    string sTag = AUR_GetParam(sPayload, "tag", "");
    string sVar = AUR_GetParam(sPayload, "var", "");
    int nValue = StringToInt(AUR_GetParam(sPayload, "value", "0"));
    object oTarget = AUR_FindObjectByTag(sTag);

    if (!GetIsObjectValid(oTarget))
    {
        AUR_Fail(sJobId, "Object not found: " + sTag);
        return;
    }

    SetLocalInt(oTarget, sVar, nValue);
    AUR_Complete(sJobId, "SetLocalInt tag=" + sTag + " var=" + sVar);
}

void AUR_HandleSetLocalString(string sJobId, string sPayload)
{
    string sTag = AUR_GetParam(sPayload, "tag", "");
    string sVar = AUR_GetParam(sPayload, "var", "");
    string sValue = AUR_GetParam(sPayload, "value", "");
    object oTarget = AUR_FindObjectByTag(sTag);

    if (!GetIsObjectValid(oTarget))
    {
        AUR_Fail(sJobId, "Object not found: " + sTag);
        return;
    }

    SetLocalString(oTarget, sVar, sValue);
    AUR_Complete(sJobId, "SetLocalString tag=" + sTag + " var=" + sVar);
}

void AUR_ExecuteJobPayload(string sPayload)
{
    string sJobId = AUR_GetParam(sPayload, "jobId", "");
    string sAction = GetStringLowerCase(AUR_GetParam(sPayload, "action", ""));

    if (GetStringLength(sJobId) == 0)
    {
        sJobId = "missing_job_id";
    }

    if (GetStringLength(sAction) == 0)
    {
        AUR_Fail(sJobId, "Missing action.");
        return;
    }

    if (sAction == "create_object")
    {
        AUR_HandleCreateObject(sJobId, sPayload);
        return;
    }
    if (sAction == "move_object")
    {
        AUR_HandleMoveObject(sJobId, sPayload);
        return;
    }
    if (sAction == "destroy_object")
    {
        AUR_HandleDestroyObject(sJobId, sPayload);
        return;
    }
    if (sAction == "set_local_int")
    {
        AUR_HandleSetLocalInt(sJobId, sPayload);
        return;
    }
    if (sAction == "set_local_string")
    {
        AUR_HandleSetLocalString(sJobId, sPayload);
        return;
    }

    AUR_Fail(sJobId, "Unsupported action: " + sAction);
}

void AUR_ExecutePubSubMessage(string sMessage)
{
    string sPayload = sMessage;

    if (FindSubString(GetStringLowerCase(sMessage), "action=") < 0)
    {
        sPayload = AUR_RedisGetString(sMessage);
    }

    if (GetStringLength(sPayload) == 0)
    {
        AUR_Log("Received empty payload for message: " + sMessage);
        return;
    }

    AUR_ExecuteJobPayload(sPayload);
}
