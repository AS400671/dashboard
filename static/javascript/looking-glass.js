/*

                d8                           
        d88~\ _d88__ Y88b  / 888-~88e  888-~\
       C888    888    Y888/  888  888b 888   
        Y88b   888     Y8/   888  8888 888   
         888D  888      Y    888  888P 888   
       \_88P   "88_/   /     888-_88"  888   
                     _/      888             

                    Copyright 2022 stypr.com

*/

const lockMutex = () => {
    document.querySelectorAll("[id^=page]").forEach(e => {
        e.classList.add("d-none")
    });
    document.querySelector(".search-help").classList.add("d-none");
    document.querySelector("#error-search").classList.add("d-none");
    document.querySelector(".search-box .form-control").setAttribute('disabled', '');
    document.querySelector("#loading-screen").classList.remove("d-none");
}

const unlockMutex = () => {
    document.querySelector(".search-help").classList.remove("d-none");
    document.querySelector(".search-box .form-control").removeAttribute('disabled');
    document.querySelector("#loading-screen").classList.add("d-none");
};

const raiseError = (message) => {
    document.querySelector("#error-search").classList.remove("d-none");
    document.querySelector("#error-search #error-text").innerText = message;
    unlockMutex();
}

const fetchPing = async (ipAddress) => {
    const result = {};
    let fetchResult = [];
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        fetchResult.push(fetchTimeout(`https://${popInfoKeys[popId]}/api.php?method=ping&target=${ipAddress}&_=${generateRandomNumber(10*10, 10**11)}`).then(res => res.json()).then(r => {
            try {
                let tempResult = {
                    'raw': r.result,
                    'min': '',
                    'avg': '',
                    'max': '',
                    'mdev': '',
                    'loss': '',
                };
                let tempPingData = r.result.split(/\r?\n/);
                let tempPingTime = tempPingData.pop().match(/\=\ (\w.+)\/(\w.+)\/(\w.+)\/(\w.+)\ ms/);
                let tempPingLoss = tempPingData.pop().match(/ (\d+)% packet loss/);

                if(!tempPingLoss) return [];
                tempResult.loss = tempPingLoss[1];
                if(!tempPingTime) return [];
                tempResult.min = tempPingTime[1];
                tempResult.avg = tempPingTime[2];
                tempResult.max = tempPingTime[3];
                tempResult.mdev = tempPingTime[4];
                return tempResult;
            } catch (e) {
                return null;
            }
        }).catch(r => {
            return [];
        }));
    }
    fetchResult = await Promise.all(fetchResult);
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        if (!fetchResult[popId]) continue;
        result[popInfoKeys[popId]] = fetchResult[popId];
    }
    return result;
}

const renderPing = async (ipAddress) => {
    const domPingBody = document.querySelector("#ping-body");
    const fetchOutput = await fetchPing(ipAddress);

    // console.log(fetchOutput);
    let tempResult = "";
    for (let popName of Object.keys(popInfo)) {
        
        let currPopInfo = popInfo[popName];
        // console.log(currPopInfo);
        if(isObject(fetchOutput[popName])){
            tempResult += `
                <tr class="w-100">
                    <td class="lh-1">
                        <span class="flag-icon-${ popInfo[popName].country } flag-icon"></span>
                        <b>${ escapeHTML(popInfo[popName].name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                    <td class="text-monospace-lg">
                        ${ escapeHTML(fetchOutput[popName].avg) }ms
                    </td>
                    <td class="text-monospace-lg">
                        ${ escapeHTML(fetchOutput[popName].min) }ms
                    </td>
                    <td class="text-monospace-lg">
                        ${ escapeHTML(fetchOutput[popName].max) }ms
                    </td>
                    <td class="text-monospace-lg">
                        ${ escapeHTML(fetchOutput[popName].mdev) }ms
                    </td>
                    <td class="text-monospace-lg t">
                        ${ escapeHTML(fetchOutput[popName].loss) }%
                    </td>
                </tr>
                <tr class="d-none">
                    <td colspan=6 style="overflow-y: scroll;" class="text-bg-secondary p-3">
                        <pre style="white-space:pre-wrap;">${ escapeHTML(fetchOutput[popName].raw) }</pre>
                    </td>
                </tr>
            `;
        }else{
            tempResult += `
                <tr class="text-bg-warning">
                    <td class="lh-1">
                        <span class="flag-icon-${ popInfo[popName].country } flag-icon"></span>
                        <b>${ escapeHTML(popInfo[popName].name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                    <td colspan=5 align=center>
                        <b>Timed out.</b>
                    </td>
                </tr>
            `;
        }
    };
    document.querySelector("#page-ping").classList.remove("d-none");
    domPingBody.innerHTML = tempResult;
};

const executeCommand = async (command) => {
    const parseCommand = command.split(" ");
    const result = {
        "result": "",
        "status": "pending"
    };
    let ipAddress = "";
    await lockMutex();

    switch(parseCommand[0]){
        case "ping":
            ipAddress = parseCommand[1];
            if(!isIPAddress(ipAddress)) return raiseError("Please enter a valid IP address.");
            console.log(await renderPing(ipAddress));
            await unlockMutex();
            break;

        case "traceroute":
            ipAddress = parseCommand[1];
            if(!isIPAddress(ipAddress)) return raiseError("Please enter a valid IP address.");
            return raiseError("NotImplemented");
            break;

        case "bgp":
            switch(parseCommand[1]){
                case "proto":
                    break;
                case "route":
                    ipAddress = parseCommand[2];
                    if(!isIPAddress(ipAddress)) return raiseError("Please enter a valid IP address.");
                    break;
                default:
                    raiseError("Invalid Command. Please check your syntax and try again!");
            }
            return raiseError("NotImplemented");
            break;

        default:
            return raiseError("Invalid Command. Please check your syntax and try again!");
    }
};

(() => {
    const searchRef = decodeURIComponent(location.hash.substring(1));
    const searchInput = document.querySelector(".search-box .form-control");

    if(searchRef){
        searchInput.value = searchRef;
    }
    searchInput.addEventListener('input', (e) => {
        if(e.target.value){
            document.querySelector(".search-help").classList.add("d-none");
        }else{
            document.querySelector(".search-help").classList.remove("d-none");
        }
    });
})();
