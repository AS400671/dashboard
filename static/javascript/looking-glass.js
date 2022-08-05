/* jshint -W104, -W119, -W083 */
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
        e.classList.add("d-none");
    });
    document.querySelector(".search-help").classList.add("d-none");
    document.querySelector("#error-search").classList.add("d-none");
    document.querySelector(".search-box .form-control").setAttribute('disabled', '');
    document.querySelector("#loading-screen").classList.remove("d-none");
};

const unlockMutex = () => {
    document.querySelector(".search-help").classList.remove("d-none");
    document.querySelector(".search-box .form-control").removeAttribute('disabled');
    document.querySelector("#loading-screen").classList.add("d-none");
};

const raiseError = (message) => {
    document.querySelector("#error-search").classList.remove("d-none");
    document.querySelector("#error-search #error-text").innerText = message;
    unlockMutex();
};

const toggleOutput = (domName) => {
    if(document.querySelector("#output-" + domName).classList.contains("d-none")){
        document.querySelector("#output-" + domName).classList.remove("d-none");
    }else{
        document.querySelector("#output-" + domName).classList.add("d-none");
    }
};

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
                let tempPingLoss = r.result.match(/ (\d+)% packet loss/);
                let tempPingTime = tempPingData.pop().match(/\=\ (\w.+)\/(\w.+)\/(\w.+)\/(\w.+)\ ms/);

                if(!tempPingLoss) return tempResult;
                tempResult.loss = tempPingLoss[1];
                if(!tempPingTime) return tempResult;
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
};

const fetchTraceroute = async (ipAddress) => {
    const result = {};
    let fetchResult = [];
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        fetchResult.push(fetchTimeout(`https://${popInfoKeys[popId]}/api.php?method=traceroute&target=${ipAddress}&_=${generateRandomNumber(10*10, 10**11)}`, timeoutSecond=15)
        .then(res => res.json())
        .then(r => r.result)
        .catch(r => {
            return [];
        }));
    }
    fetchResult = await Promise.all(fetchResult);
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        if (!fetchResult[popId]) continue;
        result[popInfoKeys[popId]] = fetchResult[popId];
    }
    return result;
};

const fetchBgpRoute = async (ipAddress) => {
    const result = {};
    let fetchResult = [];
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        fetchResult.push(fetchTimeout(`https://${popInfoKeys[popId]}/api.php?method=bgp_route_for&target=${ipAddress}&_=${generateRandomNumber(10*10, 10**11)}`)
        .then(res => res.json())
        .then(r => r.result)
        .catch(r => {
            return [];
        }));
    }
    fetchResult = await Promise.all(fetchResult);
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        if (!fetchResult[popId]) continue;
        result[popInfoKeys[popId]] = fetchResult[popId];
    }
    return result;
};

const fetchBgpProto = async () => {
    const result = {};
    let fetchResult = [];
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        fetchResult.push(fetchTimeout(`https://${popInfoKeys[popId]}/api.php?method=bgp_status&_=${generateRandomNumber(10*10, 10**11)}`)
        .then(res => res.json())
        .then(r => r.result)
        .catch(r => {
            return [];
        }));
    }
    fetchResult = await Promise.all(fetchResult);
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        if (!fetchResult[popId]) continue;
        result[popInfoKeys[popId]] = fetchResult[popId];
    }
    return result;
};

const renderPing = async (ipAddress) => {
    const domBody = document.querySelector("#ping-body");
    const fetchOutput = await fetchPing(ipAddress);

    let tempResult = "";
    let i = 0;
    for (let popName of Object.keys(popInfo)) {
        i += 1;
        let currPopInfo = popInfo[popName];
        if(isObject(fetchOutput[popName])){
            tempResult += `
                <tr class="w-100" onclick="toggleOutput('ping-${i}')" style="cursor: pointer;">
                    <td class="lh-1">
                        <span class="flag-icon-${ currPopInfo.country } flag-icon"></span>
                        <b>${ escapeHTML(currPopInfo.name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                    <td class="text-monospace-lg align-middle text-center">
                        ${ fetchOutput[popName].avg ? escapeHTML(fetchOutput[popName].avg + "ms") : "*" }
                    </td>
                    <td class="text-monospace-lg align-middle text-center d-none d-sm-none d-md-table-cell d-lg-table-cell d-xl-table-cell">
                        ${ fetchOutput[popName].min ? escapeHTML(fetchOutput[popName].min + "ms") : "*" }
                    </td>
                    <td class="text-monospace-lg align-middle text-center d-none d-sm-none d-md-table-cell d-lg-table-cell d-xl-table-cell">
                        ${ fetchOutput[popName].min ? escapeHTML(fetchOutput[popName].max + "ms") : "*" }
                    </td>
                    <td class="text-monospace-lg align-middle text-center">
                        ${ fetchOutput[popName].mdev ? escapeHTML(fetchOutput[popName].mdev + "ms") : "*" }
                    </td>
                    <td class="text-monospace-lg align-middle text-center">
                        ${ escapeHTML(fetchOutput[popName].loss) }%
                    </td>
                </tr>
                <tr class="d-none" id="output-ping-${i}">
                    <td colspan=6 style="background-color: #010; color: #fff;" class="align-middle p-3">
                        <pre class="mb-0" style="white-space:pre-wrap;">${ escapeHTML(fetchOutput[popName].raw) }</pre>
                    </td>
                </tr>
            `;
        }else{
            tempResult += `
                <tr>
                    <td class="lh-1">
                        <span class="flag-icon-${ currPopInfo.country } flag-icon"></span>
                        <b>${ escapeHTML(currPopInfo.name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                    <td colspan=5 align=center class="text-bg-warning align-middle">
                        <b>Timeout</b>
                    </td>
                </tr>
            `;
        }
    }
    document.querySelector("#page-ping").classList.remove("d-none");
    domBody.innerHTML = tempResult;
};

const renderTraceroute = async (ipAddress) => {
    const domBody = document.querySelector("#traceroute-body");
    const fetchOutput = await fetchTraceroute(ipAddress);

    let tempResult = "";
    let i = 0;
    for (let popName of Object.keys(popInfo)) {
        i += 1;
        let currPopInfo = popInfo[popName];
        if(fetchOutput[popName].length){
            tempAsPath = [...new Set(fetchOutput[popName].match(/\[(AS([0-9]+)|\*)\]/gi))].join(" | ");
            tempResult += `
                <tr class="w-100" onclick="toggleOutput('traceroute-${i}')" style="cursor: pointer;">
                    <td class="lh-1">
                        <span class="flag-icon-${ currPopInfo.country } flag-icon"></span>
                        <b>${ escapeHTML(currPopInfo.name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                    <td class="text-monospace-lg align-middle">
                        <b>${ fetchOutput[popName].split("\n").length - 1 }</b>
                    </td>
                    <td class="text-monospace-lg align-middle">
                        ${ tempAsPath.replace(/(\[|\])/gi, "").toUpperCase().replace(/\|/gi, "&raquo;") }
                    </td>
                </tr>
                <tr class="d-none" id="output-traceroute-${i}">
                    <td colspan=6 style="background-color: #010; color: #fff;" class="align-middle p-3">
                        <pre class="mb-0" style="white-space:pre-wrap;">${ escapeHTML(fetchOutput[popName].trim()) }</pre>
                    </td>
                </tr>
            `;
        }else{
            tempResult += `
                <tr>
                    <td class="lh-1">
                        <span class="flag-icon-${ currPopInfo.country } flag-icon"></span>
                        <b>${ escapeHTML(currPopInfo.name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                    <td align=center>
                        <div class="text-center text-bg-danger text-white p-3">
                            <b>Timeout</b>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    document.querySelector("#page-traceroute").classList.remove("d-none");
    domBody.innerHTML = tempResult;
};

const renderBgpRoute = async (ipAddress) => {
    const domBody = document.querySelector("#bgproute-body");
    const fetchOutput = await fetchBgpRoute(ipAddress);

    let tempResult = "";
    let i = 0;
    for (let popName of Object.keys(popInfo)) {
        i += 1;
        let currPopInfo = popInfo[popName];
        if(!fetchOutput[popName].length){
            tempResult += `
                <tr class="w-100">
                    <td class="lh-1">
                        <span class="flag-icon-${ currPopInfo.country } flag-icon"></span>
                        <b>${ escapeHTML(currPopInfo.name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                </tr>
                <tr class="w-100">
                    <td class="text-monospace-lg align-middle">
                        <pre style="background-color: #010; color: #fff; white-space:pre-wrap;" class="text-monospace-default m-0 p-3">${ escapeHTML(fetchOutput[popName]) }</pre>
                    </td>
                </tr>
            `;
        }else{
            tempResult += `
                <tr>
                    <td class="lh-1">
                        <span class="flag-icon-${ currPopInfo.country } flag-icon"></span>
                        <b>${ escapeHTML(currPopInfo.name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                    <td align=center>
                        <div class="text-center text-bg-danger text-white p-3">
                            <b>Timeout</b>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    document.querySelector("#page-bgproute").classList.remove("d-none");
    domBody.innerHTML = tempResult;
};

const renderBgpProto = async () => {
    const domBody = document.querySelector("#proto-body");
    const fetchOutput = await fetchBgpProto();

    let tempResult = "";
    let i = 0;
    for (let popName of Object.keys(popInfo)) {
        i += 1;
        let currPopInfo = popInfo[popName];

        if(fetchOutput[popName].length){
            // Cut first line 
            parseOutput = fetchOutput[popName].split("\n\n");
            parseResult = {
                'imported': 0,
                'filtered': 0,
                'exported': 0,
                'preferred': 0,
            };
            
            for(i in parseOutput){
                countList = parseOutput[i].match("Routes:[ ]+([0-9]+) imported, ([0-9]+) filtered, ([0-9]+) exported, ([0-9]+) preferred");
                if(!countList) continue;
                parseResult.imported += parseInt(countList[1]);
                parseResult.filtered += parseInt(countList[2]);
                parseResult.exported += parseInt(countList[3]);
                parseResult.preferred += parseInt(countList[4]);
            }

            tempResult += `
                <tr class="w-100" onclick="toggleOutput('proto-${i}')" style="cursor: pointer;">
                    <td class="lh-1">
                        <span class="flag-icon-${ currPopInfo.country } flag-icon"></span>
                        <b>${ escapeHTML(currPopInfo.name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                    <td class="text-monospace-lg align-middle text-center">
                        ${ parseResult.imported }
                    </td>
                    <td class="text-monospace-lg align-middle text-center">
                        ${ parseResult.preferred }
                    </td>
                    <td class="text-monospace-lg align-middle text-center">
                        ${ parseResult.exported }
                    </td>
                </tr>
                <tr class="d-none" id="output-proto-${i}">
                    <td colspan=6 style="background-color: #010; color: #fff;" class="align-middle p-3">
                        <pre class="mb-0" style="white-space:pre-wrap;">${ escapeHTML(fetchOutput[popName]) }</pre>
                    </td>
                </tr>
            `;
        }else{
            tempResult += `
                <tr>
                    <td class="lh-1">
                        <span class="flag-icon-${ currPopInfo.country } flag-icon"></span>
                        <b>${ escapeHTML(currPopInfo.name ) }</b>
                        <br>
                        <span class="text-monospace">${ escapeHTML(popName) }</span>
                    </td>
                    <td colspan=4 align=center class="text-bg-warning align-middle">
                        <b>Timeout</b>
                    </td>
                </tr>
            `;
        }
    }
    document.querySelector("#page-proto").classList.remove("d-none");
    domBody.innerHTML = tempResult;
};

const executeCommand = async (command) => {
    const parseCommand = command.split(" ");
    const result = {
        "result": "",
        "status": "pending"
    };
    let ipAddress = "";
    let target = "";
    await lockMutex();

    switch(parseCommand[0]){
        case "ping":
            target = parseCommand[1];
            if(!(isIPAddress(target) || isDomainName(target))) {
                return raiseError("Please enter a valid IP address or domain name.");
            }
            await renderPing(target);
            await unlockMutex();
            break;

        case "traceroute":
            target = parseCommand[1];
            if(!(isIPAddress(target) || isDomainName(target))) {
                return raiseError("Please enter a valid IP address or domain name.");
            }
            await renderTraceroute(target);
            await unlockMutex();
            break;

        case "bgp":
            switch(parseCommand[1]){
                case "proto":
                    await renderBgpProto();
                    await unlockMutex();
                    break;
                case "route":
                    target = parseCommand[2];
                    if(!isIPAddress(target)) {
                        return raiseError("Please enter a valid IP address.");
                    }
                    await renderBgpRoute(target);
                    await unlockMutex();
                    break;
                default:
                    raiseError("Invalid Command. Please check your syntax and try again!");
            }
            break;

        default:
            return raiseError("Invalid Command. Please check your syntax and try again!");
    }
};

(() => {
    const searchRef = decodeURIComponent(location.hash.substring(1)).replace(/\+/g, " ");
    const searchInput = document.querySelector(".search-box .form-control");

    if(searchRef){
        searchInput.value = searchRef;
        executeCommand(searchInput.value);
    }
    searchInput.addEventListener('input', (e) => {
        if(e.target.value){
            document.querySelector(".search-help").classList.add("d-none");
        }else{
            document.querySelector(".search-help").classList.remove("d-none");
        }
    });
})();
