import bot from "ROOT"
import { getWalletURL, getAnnouncementURL, getNotificationURL, headers } from "../util/api";
import { InputParameter } from "@modules/command";
import { savaUserData } from "../util/user_data";
// 不可 default 导出，函数名固定
export async function main( i: InputParameter ): Promise<void> {

    const dbKey = "extr-wave-yys-sign." + i.messageData.user_id;
    if ( await i.redis.existHashKey( dbKey, "token" ) ) {
        i.sendMessage( "已授权云原神，本次更新token" );
    }
    const token = i.messageData.raw_message;
    await savaUserData( token, i );

    //检查token有效性
    const bool = await checkToken( i.messageData.user_id );
    if ( !bool ) {
        i.sendMessage("云原神Token无效，请重新获取~");
    }
    await i.sendMessage( `已开启 [ ${ i.messageData.user_id } ] 云原神签到服务` );
}

export async function checkToken( userId: number ) {
    const dbKey = "extr-wave-yys-sign." + userId;
    //获取用户信息填充header
    headers[ "x-rpc-combo_token" ] = await bot.redis.getHashField( dbKey, "token" );
    headers[ "x-rpc-device_name" ] = await bot.redis.getHashField( dbKey, "device_name" );
    headers[ "x-rpc-device_model" ] = await bot.redis.getHashField( dbKey, "device_model" );
    headers[ "x-rpc-device_id" ] = await bot.redis.getHashField( dbKey, "device_id" );

    const message = await getWalletURL( headers );
    const data = JSON.parse( message );
    if ( data.retcode === 0 && data.message === "OK" ) {
        return true;
    }
    return false;

}

