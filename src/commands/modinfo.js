import {message, MessageEmbed, ReactionCollector} from 'discord.js'
import log from '../log'
import MPI from '../utils/ModPackIndexAPI.js'
import Utils from '../utils/MPBotUtils.js'
import InfoMessage from './utils/InfoMessage.js'
const mpiAPI = new MPI;
const utils = new Utils;



module.exports = {
  name: 'modinfo',
  description:'details info of a specified mod id',
  async execute(message, args){
    const infoMessage = new InfoMessage(message, args);
    infoMessage.sendLoadingMessage();

    const modID = args[0];
    //check if modID is valid

    const modsCache = await utils.getModsCache(100);
    const modsArray = await utils.cacheArrayifier(modsCache);

    let isValid = false;
    let modObj;
    for(let i = 0; (i+1) <= modsArray.length; i++){
      const nextObj = modsArray[i];
      const nextObjID = nextObj.id;
      if(nextObjID == modID){
        isValid = true;
        modObj = await mpiAPI.getMod(modID);
        modObj = modObj.data;
      }
    }
    modObj.link = `http://modpackindex.com/pack/${moID}`;


    if(!isValid){
      message.channel.send(`Error: \`Invalid mod id\``);
    }
    else{
      infoMessage.sendInfo(modsArray, modObj);
    }
  }
}