import "regenerator-runtime/runtime.js";
import {readdirSync, readFile} from 'fs'
import {Client, Collection, User} from 'discord.js'
import config from './config.js'
import log from './log'
import {join} from 'path'
import MongoUtil from './utils/MongoUtils'

const mongoUtil = new MongoUtil('Guilds');
mongoUtil.initialize();

const token = config.token;
const prefix = config.prefix;
const ownerID = config.ownerID
const client = new Client();
client.commands = new Collection();

async function ownerInit(){
	try{
		const owner = await client.users.fetch(ownerID, false);
		const date = new Date();
		const formattedDate = `[${date.toISOString()}]`;
		owner.send(`${formattedDate}ModPackIndexBot#Ready -> ready`);
	} catch(e){ log.error(`OwnerInit#initializeFailure -> ${e}`);}

}

const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

client.once('ready', () => {
	log.info('Client#Ready -> ready...');
	ownerInit();
});

client.on('message', async (message) => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	//better way to do this, 100% no doubt, but I'm lazy asf so stfu future stark.

	const commandArray = await message.content.slice(prefix.length).split(/ +/);
	const command = await commandArray.shift().toLowerCase();

	const args = commandArray;

	try {
		await client.commands.get(command).execute(message, args);
	} catch (error) {
		log.error(`Client#commandExecutionError -> ${error}`);
		await message.reply('There was an error trying to execute the command. If you\'re seeing this, it means the error was not caught within the command.');
		await owner.send(`An uncaught error was encountered. |Guild: \'${message.guild.name}\'<${message.guild.id}>|Message: \'${message.id}\'|Console Error: \`Client#commandExecutionError -> ${error}\``);
	}
});

client.on('guildCreate', async (guild) =>{
	//if guild doc doesn't exist
	const testDocument = guild.id;
	if(await mongoUtil.doesDocument() == false){
	//create new document in database for default parameters.
		const date = new Date;
		const guildDocument = {
			'guild': guild.id,
			'guildName': guild.name,
			'joinDate': date,
			'threshold': 0
		}
		mongoUtil.insertDocument(guildDocument);
		log.info(`Client#GuildJoin -> Bot joined new guild \'${guild.name}\'`);
	} else if(await mongoUtil.doesDocument() == true){
		log.info(`Client#GuildJoin -> Bot re-joined guild \'${guild.name}\' (Pre-Existing Database Document)`);
	}

});

client.login(token)
	.catch(e =>{
		log.error(`Client#LoginFailure -> ${e}`);
	});
