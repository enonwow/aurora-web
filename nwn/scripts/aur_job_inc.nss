#include "nwnx_redis"
#include "nwnx_redis_lib"

const string AUR_JOB_RESULT_KEY_PREFIX = "aurora:jobs:result:";

void AUR_Log(string sMessage)
{
    WriteTimestampedLogEntry("[aurora-job] " + sMessage);
}

string AUR_GetToken(string sValue, int nIndex, string sSeparator = ";")
{
    if (nIndex < 0)
    {
        return "";
    }

    string sRest = sValue;
    int nCurrent = 0;
    int nSeparatorLength = GetStringLength(sSeparator);

    while (TRUE)
    {
        int nPos = FindSubString(sRest, sSeparator);
        string sToken = sRest;

        if (nPos >= 0)
        {
            sToken = GetStringLeft(sRest, nPos);
        }

        if (nCurrent == nIndex)
        {
            return sToken;
        }

        if (nPos < 0)
        {
            return "";
        }

        int nLength = GetStringLength(sRest);
        sRest = GetStringRight(sRest, nLength - (nPos + nSeparatorLength));
        nCurrent = nCurrent + 1;
    }

    return "";
}

string AUR_GetParam(string sPayload, string sKey, string sDefault = "")
{
    int nCount = 0;
    string sLowerKey = GetStringLowerCase(sKey) + "=";

    while (TRUE)
    {
        string sToken = AUR_GetToken(sPayload, nCount, ";");
        if (GetStringLength(sToken) == 0)
        {
            break;
        }

        string sLowerToken = GetStringLowerCase(sToken);
        if (FindSubString(sLowerToken, sLowerKey) == 0)
        {
            int nKeyLength = GetStringLength(sLowerKey);
            int nTokenLength = GetStringLength(sToken);
            return GetStringRight(sToken, nTokenLength - nKeyLength);
        }

        nCount = nCount + 1;
    }

    return sDefault;
}

int AUR_EqualsNoCase(string sLeft, string sRight)
{
    return GetStringLowerCase(sLeft) == GetStringLowerCase(sRight);
}

object AUR_FindAreaByTag(string sAreaTag)
{
    if (GetStringLength(sAreaTag) == 0)
    {
        return OBJECT_INVALID;
    }

    return GetObjectByTag(sAreaTag);
}

object AUR_FindObjectByTag(string sTag)
{
    if (GetStringLength(sTag) == 0)
    {
        return OBJECT_INVALID;
    }

    return GetObjectByTag(sTag);
}

int AUR_ParseObjectType(string sObjectType)
{
    if (AUR_EqualsNoCase(sObjectType, "placeable") || AUR_EqualsNoCase(sObjectType, "door"))
    {
        return OBJECT_TYPE_PLACEABLE;
    }
    if (AUR_EqualsNoCase(sObjectType, "creature"))
    {
        return OBJECT_TYPE_CREATURE;
    }
    if (AUR_EqualsNoCase(sObjectType, "item"))
    {
        return OBJECT_TYPE_ITEM;
    }
    if (AUR_EqualsNoCase(sObjectType, "store"))
    {
        return OBJECT_TYPE_STORE;
    }
    if (AUR_EqualsNoCase(sObjectType, "waypoint"))
    {
        return OBJECT_TYPE_WAYPOINT;
    }

    return -1;
}

string AUR_RedisGetString(string sKey)
{
    return NWNX_Redis_GetResultAsString(NWNX_Redis_GET(sKey));
}

void AUR_WriteJobResult(string sJobId, string sStatus, string sMessage)
{
    string sKey = AUR_JOB_RESULT_KEY_PREFIX + sJobId;
    string sValue = "jobId=" + sJobId + ";status=" + sStatus + ";message=" + sMessage;

    NWNX_Redis_GetResultAsString(NWNX_Redis_SET(sKey, sValue));
}
