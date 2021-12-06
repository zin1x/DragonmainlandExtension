var debug = true;

function debugLog(msg, ...extra) {
    if (debug) {
        if (extra.length > 0)
            console.log(msg, extra);
        else
            console.log(msg);
    }
}

chrome.runtime.onInstalled.addListener(function() {
    getOptions((response) => {
        if (Object.keys(response).length == 0) {
            resetOptions();
        }
    });
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {hostEquals: 'dragonmaindland.io'},
            })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        },
        ]);
    });
});


function getDragonDetails(id, sendResponse) {

    fetch('https://dragonmainland.io/api/game/hero/detail?r='+Date.now(), {
      method: 'POST',
      body: JSON.stringify({
        id: id
      }),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      }
    })
    .then(response => {
        response.json().then(result => {
            console.log(result)
            let dragon = result;

            sendResponse(dragon);
        });
    })
    .catch(error => {
        console.log(error);
    });
}

function getFamilyTreeSpecies(id, sendResponse){

    function traverse(family,species,node){
         fetch('https://dragonmainland.io/api/game/hero/detail?r='+Date.now(), {
          method: 'POST',
          body: JSON.stringify({
            id: node
          }),
          headers: {
            'Content-type': 'application/json; charset=UTF-8'
          }
        })
        .then(response => {
            response.json().then(result => {
                if (result.data.father != 0 && result.data.mother!=0){
                    traverse(family, species, result.data.father) 
                    traverse(family, species, result.data.mother)
                    family.push(result.data.father)
                    family.push(result.data.mother)

                    species.push(result.data.clazz)

                }else{
                    //sendResponse(dragon);
                   species.push(result.data.clazz)

                    if(species.length==family.length+1){
                        let object = { "family": family, "species":species, 'msg':"OK"}
                        sendResponse(object);

                    }

                }

            });
        })
        .catch(error => {
            console.log(error);
        });


    }

    traverse([],[], id);

}


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    if (request.contentScriptQuery == "getDragonDetails") {
        getDragonDetails(request.dragonID, sendResponse);
        return true;
    }
    if (request.contentScriptQuery == "getFamilyTreeSpecies") {
        getFamilyTreeSpecies(request.dragonID, sendResponse);
        return true;
    }
});



chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
    /*
        Monitor for tab changes. and trigger contentScript.js 

    */
  if (changeInfo.status == 'complete' && tab.url != undefined && tab.active) {
    
    /* Trigger message to contentScript.js */
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {greeting: "hello"}, function(response) {
        //console.log(response.farewell);
      });
    });


  }

})

