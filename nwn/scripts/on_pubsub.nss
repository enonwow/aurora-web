#include "nwnx_redis_ps"
#include "aur_job_exec"

void main()
{
    struct NWNX_Redis_PubSubMessageData msg = NWNX_Redis_GetPubSubMessageData();
    AUR_Log("PubSub channel=" + msg.channel + " message=" + msg.message);
    AUR_ExecutePubSubMessage(msg.message);
}
