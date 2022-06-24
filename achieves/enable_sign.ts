import { InputParameter, Order, OrderMatchResult } from "@modules/command";
import { savaUserData } from "../util/user_data";
import { SendFunc } from "@modules/message";
import { AuthLevel } from "@modules/management/auth";
import { scheduleJob } from "node-schedule";
import { pull } from "lodash";

const tempSubscriptionList: number[] = [];

async function subscribe( userID: number, send: SendFunc, a: AuthLevel, CONFIRM: Order ): Promise<string> {
	
	if ( tempSubscriptionList.includes( userID ) ) {
		return "您已经处于云原神签到服务申请状态";
	}
	
	tempSubscriptionList.push( userID );
	
	const d = new Date();
	scheduleJob( d.setMinutes( d.getMinutes() + 3 ), async () => {
		const isFinish: number | undefined = tempSubscriptionList.find( el => el === userID );
		
		if ( isFinish !== undefined ) {
			pull( tempSubscriptionList, userID );
			await send( "云原神签到服务申请超时，BOT 自动取消\n" +
				"请先检查发送消息内容是否符合要求\n");
		}
	} );
	
	let title: string = `『${ userID }』您好 \n`;
	return title + "请务必确保 BOT 持有者可信任\n" +
		`本BOT承诺未经您的允许不使用此token\n` +
		`确定开启该功能，使用以下指令来开启\n` +
		`「 ${ CONFIRM.getHeaders()[0] } token 」\n` +
		"请在 3 分钟内进行，超时会自动取消\n"
}

async function confirm(
	userID: number, token: string,
	a: AuthLevel, SUBSCRIBE: Order
): Promise<string> {
	if ( !tempSubscriptionList.some( el => el === userID ) ) {
		return `你还未申请云原神签到服务，请先使用「${ SUBSCRIBE.getHeaders()[0] }」`;
	}
	
	/* 由于腾讯默认屏蔽含有cookie消息，故采用base64加密一下？试试 */
	const reg = new RegExp( /.*?oi=([0-9]+).*?/g );
	let execRes: RegExpExecArray | null = reg.exec( token );
	if ( execRes === null ) {
			return "抱歉，请重新提交正确的 token";
		}
	
	pull( tempSubscriptionList, userID );
	//进行操作
	return await savaUserData( token, userID );
}


/* 根据SilverStar的Private Subscribe编写 */
export async function main(
	{ messageData, command, auth, sendMessage, matchResult }: InputParameter
): Promise<void> {
	
	const userID: number = messageData.user_id;
	const data: string = messageData.raw_message;
	
	const header = ( <OrderMatchResult>matchResult ).header;
	const au: AuthLevel = await auth.get( userID );
	
	const SUBSCRIBE = <Order>command.getSingle( "extr-wave-yysign.enable", au );
	const YCONFIRM = <Order>command.getSingle( "extr-wave-yysign.confirm", au );
	
	if ( SUBSCRIBE.getHeaders().includes( header ) ) {
		const msg: string = await subscribe( userID, sendMessage, au, YCONFIRM );
		await sendMessage( msg );
	} else if ( YCONFIRM.getHeaders().includes( header ) ) {
		const msg: string = await confirm( userID, data, au, SUBSCRIBE );
		await sendMessage( msg );
	}
}

