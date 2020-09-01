import {message, MessageEmbed} from 'discord.js'
import log from '../log'
import MPI from '../utils/ModPackIndexAPI.js'
const modpackIndexAPI = new MPI;
import Utils from '../utils/MPBotUtils.js'
const utils = new Utils;
import NodeCache from 'node-cache'
import Fuse from 'fuse.js'

const modsCache = new NodeCache();

//this doesn't seem like the ES8 kosher way to do this. It works, however I
// believe there should be a better way. I only want this to export 1 thing, &
// it should run on call, but idk how to do that..
module.exports = {
  name: 'modsearch',
  description:'lists mods based on search query',
  async execute (message, args){
    //Return without search parameters
    if(!args){
      message.channel.send('No search paramaters given. \`Usage: mp!modsearch <search term> Ex: mp!modsearch revelations\`')
      return;
    }

    //Retrieve mod data from API request cache.
    const modsCache = await utils.getModsCache(100);
    const modsArray = await utils.cacheArrayifier(modsCache);

    //initialize fuze object: Search name of mods for the exact search phrase anywhere in the title.
    const searchOptions = {
      includeScore: true,
      keys: ['name'],
      limit: 30,
      ignoreLocation: true,
      threshold: .1
    }
    const fuse = new Fuse(modsArray, searchOptions);
    let searchResult = await fuse.search(args);

    //sort matches by ModPackIndex ranking
    try{
      searchResult.sort(function(a, b){return a.item.popularity_rank-b.item.popularity_rank;})
    }
    catch(e){
      log.error(`modsearchCommand#sortingError -> ${e}`);
    }

    //Take top 15 results, ship them off to discord.
    let finalSearchSet = new Array();
    for(let i = 0; (i+1) <= searchResult.length; i++){
      finalSearchSet[i] = searchResult[i];
    }
      const searchResultsEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Search Results For \'${args}\'`)
     	  .setTimestamp()
        .setFooter('Powered by modpackindex.com');
      for(let i = 0; i <= 9; i++){
        if(i == finalSearchSet.length){break;}
        searchResultsEmbed.addField(`${i+1}) ${finalSearchSet[i].item.name}`, finalSearchSet[i].item.summary);
      }
      message.channel.send(searchResultsEmbed);

      const filter = m => (m.author.id === message.author.id);
      const collector = message.channel.createMessageCollector(filter, {max: 1, maxMatches: 1, time: 10000});
      collector.on('collect', collectedMessage => {
        const selection = Number(collectedMessage.content);
        const selectedMod = searchResult[selection];
        let authors = ' ';
        for(let i = 0; (i + 1) <= selectedMod.item.authors.length; i++){
          //Here lies stark's sanity - killed by using = instead of === like a fucking idiot
          if(i===0){ authors = authors + `${selectedMod.item.authors[i].name}`}
          else{authors = authors + `, ${selectedMod.item.authors[i].name}`}
        }

        const modEmbed = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(selectedMod.item.name)
          .setThumbnail(selectedMod.item.thumbnail_url)
          .addField(`Description:`, selectedMod.item.summary)
          .addField(`Authors:`, authors, true)
          .addField(`Downloads:`, selectedMod.item.download_count, true)
          .addField(`Last modified:`, selectedMod.item.last_modified, true)
          .addField(`Last updated:`, selectedMod.item.last_updated, true);
        message.channel.send(modEmbed);
      });
  }
}
