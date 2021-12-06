var currentURL = window.location.href;
var dragon = {};
var debug = true;

function debugLog(msg, ...extra) {
    if (debug) {
        if (extra.length > 0)
            console.log(msg, extra);
        else
            console.log(msg);
    }
}


const ID_PATTERN = /\/myDragonDetail\/(\d+)/;
function getDragonIDFromURL(url) {
    let m = url.match(ID_PATTERN);
    if (m) {
        return parseInt(m[1]);
    }
    return -1;
}


function getDragonDetails(id) {

    return new Promise((resolve, reject) => {

        if (id in dragon) {

            resolve(dragon[id]);
        } else {

            dragon[id] = {}; //kind of mutex

            chrome.runtime.sendMessage({contentScriptQuery: "getDragonDetails", dragonID: id}, function(result) {
                dragon[id] = result;
                // Do other stuffs here
                // to process the dragon details obtained
                resolve(result);
            });
        }
    });
}


function getFamilyTreeSpecies(id) {

    return new Promise((resolve, reject) => {

        chrome.runtime.sendMessage({contentScriptQuery: "getFamilyTreeSpecies", dragonID: id}, function(result) {
            dragon[id] = result;
            // Do other stuffs here
            // to process the dragon details obtained
            resolve(result);
            });
    });
}

function appendTrait(table, trait) {
    let row = document.createElement("tr");

    for (let position in trait) {

        let data = document.createElement("td");
        //let span = document.createElement("span");
        data.setAttribute('width', '20%');
        //span.textContent = trait[position].name;
        //data.appendChild(span);
        data.textContent=trait[position].name;
        row.appendChild(data);
    }

    table.appendChild(row);

}


function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function secondsToDhms(milliseconds) {
    seconds = Number(milliseconds/1000); // convert to seconds
    var d = Math.floor(seconds / (3600*24));
    var h = Math.floor(seconds % (3600*24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);

    var dDisplay = d > 0 ? d + (d == 1 ? "d, " : "d, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? "h, " : "h, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? "m, " : "m, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? "s" : "s") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function deduplicate(arr){
    let chars = arr;
    let uniqueChars = [...new Set(chars)];
    return uniqueChars
}

async function run() {
    let dbg;
    try {
        //enum list of dragons on marketplace
        let dragon_lists = document.querySelectorAll("div.content>div.wrap>div.item");

        //## Update currentURL
        currentURL=window.location.href

        if (currentURL.match(/https:\/\/dragonmainland\.io\/#\/myMainland\/myDragonDetail\/\d+/)) {
            let dragonID = getDragonIDFromURL(currentURL);

            if (dragonID == -1) throw "Bad dragon ID";
            let dragon;
            let family;
            dragon = await getDragonDetails(dragonID);
            family_species = await getFamilyTreeSpecies(dragonID);

            //debugLog("result of getDragonDetails..", dragon)
            //debugLog("result of getFamilyTreeSpecies..", family_species)


            if (dragon.msg == "OK" && family_species.msg=="OK") {
                var inject=document.createElement("div"); 
                inject.className = 'addon';
                
                let resttime = 0;
                if (Date.now() >parseInt(dragon.data.restEndTime)){
                    //rest time already past
                    resttime=-1;
                }
                else{
                    resttime = secondsToDhms(parseInt(dragon.data.restEndTime)- Date.now())
                }

                let inbreed = false;
                if (deduplicate(family_species.family).length != family_species.family.length){
                    inbreed=true
                }

                let pure = false;
                if (deduplicate(family_species.species).length==1){
                    pure=true
                }

                let table = document.createElement("table");
                appendTrait(table, {d: {name: "boneCount"}, r1: {name: "mutation"}, r2: {name: "restEndTime"}, r3:{name:"inbreed"},r4:{name:"pureBreed"}});
                appendTrait(table, {d: {name: dragon.data.boneCount}, r1: {name: dragon.data.mutation}, r2: {name: resttime}, r3:{name:inbreed}, r4:{name:pure}});
                
                //if it is an egg
                if (dragon.data.status==1){
                    appendTrait(table, {d: {name: "CE"}});
                    appendTrait(table, {d: {name: dragon.data.ce}});

                }

                inject.style["border-color"]= "hsla(0,0%,100%,0.12)"
                inject.style["font-family"] = "GothamRounded-Medium,GothamRounded"
                inject.style["font-size"] = "13.2px"
                inject.style["width"] = "100%";

                inject.style["color"] = "#FFFFFF";
                inject.style["border-style"] = "solid";
                inject.style["border-width"] = "0.05px";
                inject.style["border-radius"] = "1px";
                inject.style["white-space"] = "nowrap";
                inject.style["padding-left"] = "5px"
                inject.style["padding-top"] = "5px";
                inject.style["padding-bottom"] = "5px";
                inject.style["padding-right"] = "5px";
                inject.style["margin-top"] = "-50%"; //create gap between the button on top
                inject.style["text-align"]="center";
                inject.appendChild(table);
                await sleep(1000);

                if (!document.getElementsByClassName("addon")[0]){
                    //If class "addon" dont already exist, append the stats table
                    var newdiv = document.getElementsByClassName("btns-wrap-main")[0];
                    newdiv.parentNode.appendChild(inject, newdiv)

                }
            }


            
        }
        else {
            debugLog("dont myDragonDetail")
        }


    } catch (e) {
        console.log("ERROR: " + e);
        console.log(e.stack);
        console.log(dbg);
        throw(e);
    } finally {
        rescanning = false;
    }
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    /*
    debugLog(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the background.js");
    */

    /* check for the json that came in
        respond with another json to the sender */

    if (request.greeting == "hello")
      sendResponse({farewell: "goodbye"});
    
    currentURL=window.location.href
    if (currentURL.match(/https:\/\/dragonmainland\.io\/#\/myMainland\/myDragonDetail\/\d+/)) {
        run()
    }
    
  });

