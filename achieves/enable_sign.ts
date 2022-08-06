import { InputParameter, Order, OrderMatchResult } from "@modules/command";
import { savaUserData } from "../util/user_data";
import { SendFunc } from "@modules/message";
import { AuthLevel } from "@modules/management/auth";
import { scheduleJob } from "node-schedule";
import { pull } from "lodash";
import { Client } from "oicq";

const tempSubscriptionList: number[] = [];

async function subscribe( userID: number, send: SendFunc, a: AuthLevel, CONFIRM: Order, client: Client ): Promise<string> {
	
	if ( tempSubscriptionList.includes( userID ) ) {
		return "您已经处于云原神签到服务申请状态";
	}
	
	tempSubscriptionList.push( userID );
	
	const d = new Date();
	scheduleJob( d.setMinutes( d.getMinutes() + 3 ), async () => {
		const isFinish: number | undefined = tempSubscriptionList.find( el => el === userID );
		
		if ( isFinish !== undefined ) {
			pull( tempSubscriptionList, userID );
			await send( "云原神签到服务申请超时，BOT 自动取消");
		}
	} );
	
	const temp = await client.getStrangerInfo( userID  );
	let info = temp.data;
	let title: string = `『${ userID }』您好 \n`;
	if ( info ) {
		title = `『 ${ info.nickname } 』您好 \n`
	}
	
	return title +
		"请务必确保 BOT 持有者可信任\n" +
		`BOT承诺保护您的账户信息安全\n` +
		`确定开启授权功能请使用此指令\n ` +
		`「 ${ CONFIRM.getHeaders()[0] } token 」 来继续\n` +
		"token是需要按照教程获取并替换\n" +
		"请在 3 分钟内进行超时会自动取消"
}

async function confirm(
	userID: number, token: string,
	a: AuthLevel, SUBSCRIBE: Order
): Promise<string> {
	if ( !tempSubscriptionList.some( el => el === userID ) ) {
		return `你还未申请云原神签到服务，请先使用「${ SUBSCRIBE.getHeaders()[0] }」申请`;
	}
	
	const reg = new RegExp( /.*?oi=([0-9]+).*?/g );
	let execRes: RegExpExecArray | null = reg.exec( token );
	if ( execRes === null ) {
		return "抱歉，请重新提交正确的 token\n" +
			`token是需要按照教程获取并替换`;
	}
	pull( tempSubscriptionList, userID );
	//进行操作
	return await savaUserData( token, userID, execRes[1] );
}


/* 根据SilverStar的Private Subscribe编写 */
export async function main(
	{ messageData, command, auth, sendMessage, matchResult, client }: InputParameter
): Promise<void> {
	
	const userID: number = messageData.user_id;
	const data: string = messageData.raw_message;
	
	const header = ( <OrderMatchResult>matchResult ).header;
	const au: AuthLevel = await auth.get( userID );
	
	const SUBSCRIBE = <Order>command.getSingle( "extr-wave-yysign-enable", au );
	const YCONFIRM = <Order>command.getSingle( "extr-wave-yysign-confirm", au );
	
	if ( SUBSCRIBE.getHeaders().includes( header ) ) {
		const msg: string = await subscribe( userID, sendMessage, au, YCONFIRM, client );
		await sendMessage( msg );
	} else if ( YCONFIRM.getHeaders().includes( header ) ) {
		const msg: string = await confirm( userID, data, au, SUBSCRIBE );
		await sendMessage( msg );
	}
}

