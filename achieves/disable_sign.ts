import { InputParameter } from "@modules/command";
// 不可 default 导出，函数名固定
export async function main( i: InputParameter ): Promise<void> {

    const dbKey = "extr-wave-yys-sign." + i.messageData.user_id;
    await i.redis.deleteKey( dbKey );
    await i.sendMessage( `已取消您的所有云原神签到服务` );
}