import bot from "ROOT";
import { scheduleJob } from "node-schedule";
import { getWalletURL, HEADERS } from "../util/api";
import { getHeaders } from "#yyscloud/util/header";
import { InputParameter } from "@modules/command";
import * as Msg from "@modules/message";
import { MessageType } from "@modules/message";


//定时任务
export async function autoSign() {
	bot.logger.info( "云原神自动签到服务已启动" );
	scheduleJob( "5 6 7 * * *", async () => {
		await allSign( true );
	} );
}

async function allSign( auto: boolean, sendMessage?: Msg.SendFunc ) {
	let keys: string[] = await bot.redis.getKeysByPrefix( 'extr-wave-yys-sign-*' );
	const result: string[] = [];
	
	for ( let key of keys ) {
		let userId = Number.parseInt( key.split( '-' )[4] );
		let yysId = key.split( '-' )[5];
		let account = await bot.client.getStrangerInfo( userId );
		let nickname = account.data?.nickname;
		
		bot.logger.info( `正在进行 [ ${ nickname } ] - [ ${ yysId } ] 云原神签到` );
		try {
			//获取用户信息填充header
			const headers: HEADERS = await getHeaders( userId, yysId );
			const message = await getWalletURL( headers );
			const data = JSON.parse( message );
			const sendPostMessage = await bot.message.getSendMessageFunc( userId, MessageType.Private );
			if ( data.retcode === 0 && data.message === "OK" ) {
				if ( auto ) {
					const Msg =
						`今日云原神签到成功\n` +
						`云原神账号：${ yysId }\n` +
						`畅玩卡状态：${ data.data.play_card.short_msg }\n` +
						`当前米云币数量：${ data.data.coin.coin_num }\n` +
						`今日获得分钟数：15\n` +
						`当前剩余免费时间：${ data.data.free_time.free_time } / ${ data.data.free_time.free_time_limit }\n` +
						`当前剩余总分钟数：${ data.data.total_time }`;
					await sendPostMessage( Msg );
				}
				result.push( `[ ${ nickname } ] - [ ${ yysId } ] 签到成功` );
			} //签到失败
			else {
				if ( auto ) {
					await sendPostMessage( data.message );
				}
				result.push( `[ ${ nickname } ] - [ ${ yysId } ]: 账号已过期或者防沉迷限制` );
				bot.logger.error( `[ ${ nickname } ] - [ ${ yysId } } ]: 账号已过期或者防沉迷限制` );
			}
		} catch ( error ) {
			result.push( ( `[ ${ nickname } ] - [ ${ yysId } ]:` + JSON.stringify( error ) ) );
			bot.logger.error( error );
		}
	}
	//用户数太多的话分条发送
	if ( result.length > 0 && sendMessage ) {
		let index = 0;
		while ( index < result.length ) {
			const temp = result.slice( index, index + 40 );
			await sendMessage( [ ...temp ].join( "\n" ) );
			index += 40;
		}
	}
}

export async function main( { sendMessage }: InputParameter ) {
	await allSign( false, sendMessage );
}
