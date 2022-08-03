
var dataLoadedComplete = false;
var myChart = null;

const popInfo = {
    "pop.nyo.network.stypr.com": {
        "name": "New York",
        "country": "us",
    },
    "pop.fre.network.stypr.com": {
        "name": "Fremont",
        "country": "us",
    },
    "pop.par.network.stypr.com": {
        "name": "Paris",
        "country": "fr",
    },
    "pop.sel.network.stypr.com": {
        "name": "Seoul",
        "country": "kr",
    },
};
const popInfoKeys = Object.keys(popInfo);

const dataLoaded = {
    'infrastructure': {},
    'prefixes': {},
    'connectivity': {},
    'popDead': [],
};

const isObject = (item) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

const mergeDeep = (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, {
                    [key]: {}
                });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, {
                    [key]: source[key]
                });
            }
        }
    }
    return mergeDeep(target, ...sources);
}

const domCross = `
    <svg class="bi d-block" width="24" height="24">
        <use xlink:href="#dead" />
    </svg>
`;

const isIPAddress = (ip, prefix = false) => {
    const regexV6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/gi;
    const regexV4 = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
    const regexPrefixV6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/[0-9]{1,3}$/gi;
    const regexPrefixV4 = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\/[0-9]{1,3}$/gi;

    if (regexV6.test(ip)) return "v6";
    if (regexV4.test(ip)) return "v4";
    if (prefix) {
        if (regexPrefixV6.test(ip)) return "v6";
        if (regexPrefixV4.test(ip)) return "v4";
    }
    return false;
};

const generateRandomNumber = (min = 52, max = 235) => Math.floor(Math.random() * (max - min + 1) + min);
const generateRandomColor = () => {
    return `rgb(${generateRandomNumber()}, ${generateRandomNumber()}, ${generateRandomNumber()})`;
};

const fetchTimeout = async (resource, options = {}) => {
    let {
        timeout = 5000
    } = options;
    let controller = new AbortController();
    let id = setTimeout(() => controller.abort(), timeout);
    let response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
};

const ping = async (url, callback) => {
    let startTime = Date.now()
    this.fetchTimeout(`${url}/api.php?cache=${+Date.now()}`, {
            mode: "no-cors",
            cache: "no-cache",
        })
        .then((r) => {
            let endTime = Date.now()
            let timeElapsed = endTime - startTime
            if (callback !== undefined) {
                callback(timeElapsed)
            }
        })
        .catch((r) => {
            callback(undefined);
        })
};

const fetchInfrastructure = async () => {
    const result = {};
    let fetchResult = [];
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        fetchResult.push(fetchTimeout(`https://${popInfoKeys[popId]}/api.php?method=traffic&_=${generateRandomNumber(10*10, 10**11)}`).then(res => res.json()).then(r => {
            try {
                let tempResult = {
                    'hour': [],
                    'total': [],
                    'rx': [],
                    'tx': []
                };
                let tempData = JSON.parse(r.result);
                for (let i = 0; i < tempData.hour.length; i += 1) {
                    let tempTime = (String(tempData.hour[i].time.hour).padStart(2, "0") + ":" + String(tempData.hour[i].time.minute).padStart(2, "0"));
                    let tempTotal = tempData.hour[i].rx + tempData.hour[i].tx;
                    tempResult.hour.push(tempTime);
                    tempResult.total.push(tempTotal);
                    tempResult.rx.push(tempData.hour[i].rx);
                    tempResult.tx.push(tempData.hour[i].tx);
                }
                return tempResult;
            } catch (e) {
                return {
                    'hour': [],
                    'total': [],
                    'rx': [],
                    'tx': []
                };
            }
        }).catch(r => {
            if (!dataLoaded.popDead.includes(popInfoKeys[popId])) dataLoaded.popDead.push(popInfoKeys[popId]);
            return r;
        }));
    }

    fetchResult = await Promise.all(fetchResult);
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        if (!fetchResult[popId]) continue;
        result[popInfoKeys[popId]] = fetchResult[popId];
    }
    return result;
}

const fetchPrefixes = async () => {
    const result = {};
    let fetchResult = [];
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        fetchResult.push(fetchTimeout(`https://${popInfoKeys[popId]}/api.php?method=bgp_announcement&_=${generateRandomNumber(10*10, 10**11)}`).then(res => res.json()).then(r => {
            try {
                let tempResult = [];
                let tempPrefixData = r.result.split(/\r?\n/);
                for (let i = 0; i < tempPrefixData.length; i += 1) {
                    let tempPrefixValue = tempPrefixData[i].trim();
                    if (isIPAddress(tempPrefixValue, true)) {
                        tempResult.push(tempPrefixValue);
                    }
                }
                return tempResult;
            } catch (e) {
                return null;
            }
        }).catch(r => {
            if (!dataLoaded.popDead.includes(popInfoKeys[popId])) dataLoaded.popDead.push(popInfoKeys[popId]);
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

const fetchConnectivity = async () => {
    const result = {
        'upstreams': null,
        'downstreams': null,
        'exchanges': null,
    };
    let fetchResult = [];

    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        fetchResult.push(
            fetchTimeout(`https://${popInfoKeys[popId]}/api.php?method=connectivity&_=${generateRandomNumber(10*10, 10**11)}`)
            .then(res => res.json())
            .then(r => {
                popInfo[popInfoKeys[popId]]['version'] = r.version;
                return JSON.parse(r.result);
            })
            .catch(r => {
                if (!dataLoaded.popDead.includes(popInfoKeys[popId])) dataLoaded.popDead.push(popInfoKeys[popId]);
                return {
                    'upstreams': {},
                    'exchanges': {},
                    'downstreams': {}
                };
            })
        );
    }
    fetchResult = await Promise.all(fetchResult);
    for (let popId = 0; popId < popInfoKeys.length; popId += 1) {
        if (!fetchResult[popId]) continue;
        mergeDeep(result, fetchResult[popId]);
    }
    return result;
};

const renderExchanges = async () => {
    const exchangesDOM = document.querySelector("#exchanges-body");
    exchangesDOM.innerHTML = "";
    const fetchOutput = dataLoaded.connectivity;

    const listExchanges = {};
    for (let exchange of Object.keys(fetchOutput.exchanges)) {
        let exchangeInfo = fetchOutput.exchanges[exchange];
        let exchangeIP = exchangeInfo.ip.length ? exchangeInfo.ip : null;
        if (listExchanges[exchangeInfo.provider]) {
            if (!listExchanges[exchangeInfo.provider].ip[exchangeInfo.version]) {
                listExchanges[exchangeInfo.provider].ip[exchangeInfo.version] = exchangeIP;
            }
        } else {
            listExchanges[exchangeInfo.provider] = {
                ...exchangeInfo,
                'ip': {}
            }
            listExchanges[exchangeInfo.provider].ip[exchangeInfo.version] = exchangeIP;
        }
    }

    tempResult = "";
    for (let exchangeName of Object.keys(listExchanges)) {
        exchangeInfo = listExchanges[exchangeName];
        tempResult += `
            <tr class="${ !(exchangeInfo.ip.v4 || exchangeInfo.ip.v6) ? 'text-bg-warning' : '' }">
                <td align=right>
                    <a href="https://bgp.tools/as/${ exchangeInfo.asn }" class="text-black">
                        <span class="text-monospace">
                            ${ exchangeInfo.asn }
                        </span>
                    </a>
                </td>
                <td>
                    <span class="flag-icon-${ exchangeInfo.country } flag-icon"></span>
                    ${ exchangeName }
                </td>
                <td>
                    ${ exchangeInfo.ip.v4 ? exchangeInfo.ip.v4 : domCross }
                </td>
                <td>
                    ${ exchangeInfo.ip.v6 ? exchangeInfo.ip.v6 : domCross }
                </td>
                <td>
                    ${ exchangeInfo.speed }
                </td>
            </tr>
        `;
    }
    exchangesDOM.innerHTML = tempResult;
};

const renderConnectivity = async () => {
    const connectivityDOM = document.querySelector("#connectivity-body")
    connectivityDOM.innerHTML = "";
    const fetchOutput = dataLoaded.connectivity;

    const listConnectivity = {};

    ["upstreams", "downstreams"].forEach(type => {
        // ASN
        for (let version of Object.keys(fetchOutput[type])) {
            for (let asn of Object.keys(fetchOutput[type][version])) {
                asnInfo = fetchOutput[type][version][asn];
                if (listConnectivity[asn]) {
                    listConnectivity[asn].version.push(version);
                } else {
                    listConnectivity[asn] = {
                        ...asnInfo,
                        type: type,
                        version: [version]
                    }
                    // if speed is not provided, add exchange's speed
                    if (!asnInfo.speed) {
                        speed = fetchOutput["exchanges"][listConnectivity[asn].exchange].speed
                        listConnectivity[asn].speed = speed;
                    }
                }
            }
        }
    });

    tempResult = "";
    for (let asnName of Object.keys(listConnectivity)) {
        asnInfo = listConnectivity[asnName];
        // console.log(asnInfo);

        tempResult += `
            <tr>
                <td align=right>
                    <a href="https://bgp.tools/as/${asnName}" class="text-black">
                        <span class="text-monospace">
                            ${asnName}
                        </span>
                    </a>
                </td>
                <td>
                    <span class="flag-icon-${asnInfo.country} flag-icon"></span>
                    ${ asnInfo.provider ? asnInfo.provider : asnInfo.name }
                </td>
                <td>
                    ${ asnInfo.type == "upstreams" ? '<span class="badge text-bg-success">Upstream</span>' : '' }
                    <!-- ${ asnInfo.type == "downstreams" ? '<span class="badge text-bg-primary">Peer</span>' : '' } -->
                    ${ asnInfo.version.includes("v4") ? '<span class="badge text-bg-secondary">IPv4</span>' : '' }
                    ${ asnInfo.version.includes("v6") ? '<span class="badge text-bg-primary">IPv6</span>' : '' }
                </td>
                <td>
                    ${ asnInfo.speed }
                </td>
            </tr>
        `;
    }
    connectivityDOM.innerHTML = tempResult;
};

const renderPrefixes = async () => {
    const prefixDOM = document.querySelector("#prefixes-body")
    prefixDOM.innerHTML = "";
    const fetchOutput = dataLoaded.prefixes;
    const fetchOutputKeys = Object.keys(fetchOutput);

    const listPrefixes = {};
    // check if the prefix is anycasted
    for (let i = 0; i < fetchOutputKeys.length; i++) {
        fetchOutput[fetchOutputKeys[i]].forEach((prefix) => {
            if (listPrefixes[prefix]) {
                listPrefixes[prefix].type = 'anycast';
                listPrefixes[prefix].announce_pop.push(fetchOutputKeys[i]);
                listPrefixes[prefix].announce_country.push(popInfo[fetchOutputKeys[i]].country);
            } else {
                listPrefixes[prefix] = {
                    version: isIPAddress(prefix, true),
                    type: 'unicast',
                    announce_pop: [fetchOutputKeys[i]],
                    announce_country: [popInfo[fetchOutputKeys[i]].country]
                }
            }
        });
    }
    const listPrefixesKeys = Object.keys(listPrefixes);

    // render elements
    let tempResult = "";
    for (let i = 0; i < listPrefixesKeys.length; i++) {
        prefixName = listPrefixesKeys[i]
        prefixInfo = listPrefixes[listPrefixesKeys[i]];

        tempResult += `
            <tr>
                <td align=right>
                    <span class="text-monospace">
                        ${prefixInfo.version}
                    </span>
                </td>
                <td>
                    <span class="flag-icon-${(prefixInfo.type == "anycast") ? "un" : prefixInfo.announce_country[0] } flag-icon"></span>
                    ${prefixName}
                </td>
                <td>stypr LLC Network</td>
                <td>
                    <span class="badge text-bg-success">Implemented</span>
                </td>
            </tr>
        `;
    }
    prefixDOM.innerHTML = tempResult;
};

const renderInfrastructure = async (type = "total") => {
    const fetchOutput = dataLoaded.infrastructure;
    const fetchOutputKeys = Object.keys(fetchOutput);
    const ctx = document.getElementById('myChart');
    feather.replace({
        'aria-hidden': 'true'
    })
    const chartLabels = fetchOutput[fetchOutputKeys[0]].hour;
    const chartDatasets = [];

    for (let i = 0; i < fetchOutputKeys.length; i++) {
        let color = generateRandomColor();
        chartDatasets.push({
            responsive: true,
            label: popInfo[popInfoKeys[i]].name,
            data: fetchOutput[fetchOutputKeys[i]].total,
            lineTension: 0.3,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: color,
            pointBackgroundColor: color,
        });
    }
    Chart.defaults.font.family = "Suit Variable";
    if (myChart instanceof Chart) {
        myChart.destroy();
    }
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: chartDatasets
        },
        interaction: {
            intersect: true,
        },
        options: {
            scales: {
                y: {
                    ticks: {
                        beginAtZero: false,
                        callback: (value) => {
                            return `${value/1000000} MiB`;
                        }
                    }
                }
            }
        },
    })

    /* PoP information */
    let dompopInfoKeys = document.querySelector("#list-pop");
    let tempOutput = "";
    for (let i in popInfoKeys) {
        tempOutput += `
            <div id="" class="lh-1 pt-1 d-flex align-items-center w-100">
                <div class="p-0 pt-2">
                    <span class="flag-icon-${popInfo[popInfoKeys[i]].country} flag-icon" style="font-size: 32pt;"></span><br>
                    <span class="badge no-round ${ !dataLoaded.popDead.includes(popInfoKeys[i]) ? "text-bg-success" : "text-bg-danger" } mt-1 text-center w-100" style="font-size: 8pt;">
                        ${ !dataLoaded.popDead.includes(popInfoKeys[i]) ? "ACTIVE" : "ERROR" }
                    </span>
                </div>
                <div class="p-2">
                    <b>${popInfo[popInfoKeys[i]].name}</b><br>
                    <span class="text-monospace">
                        ${popInfo[popInfoKeys[i]].version ? popInfo[popInfoKeys[i]].version : "unknown"}
                    </span>
                    </div>
            </div>`;

    }
    dompopInfoKeys.innerHTML = tempOutput;
};

const updateCounter = async () => {
    /* Remove duplicate anycast prefixes */
    let domPrefixCounter = document.querySelector("#counter-prefixes");
    let prefixCount = 0;
    let prefixDuplicates = [];
    for (let i of Object.keys(dataLoaded.prefixes)) {
        for (let j of Object.keys(dataLoaded.prefixes[i])) {
            let prefix = dataLoaded.prefixes[i][j];
            if (!prefixDuplicates.includes(prefix)) {
                prefixDuplicates.push(prefix);
                prefixCount += 1
            }
        }
    }
    domPrefixCounter.innerText = prefixCount;

    /* Remove duplicate exchange entries */
    let domExchangeCounter = document.querySelector("#counter-exchanges");
    let exchangeCount = 0;
    let exchangeDuplicates = [];
    for (let i of Object.keys(dataLoaded.connectivity.exchanges)) {
        let exchange = dataLoaded.connectivity.exchanges[i];
        if (!exchangeDuplicates.includes(exchange.provider)) {
            exchangeDuplicates.push(exchange.provider);
            exchangeCount += 1;
        }
    }
    domExchangeCounter.innerText = exchangeCount;

    /* Remove duplicate connectivity entries */
    let domConnectivityCounter = document.querySelector("#counter-connectivity");
    let connectivityCount = 0;
    let connectivityDuplicates = [];

    for (let i of Object.keys(dataLoaded.connectivity.upstreams)) {
        for (let j of Object.keys(dataLoaded.connectivity.upstreams[i])) {
            let upstreamInfo = dataLoaded.connectivity.upstreams[i][j];
            if (!connectivityDuplicates.includes(upstreamInfo.provider)) {
                connectivityDuplicates.push(upstreamInfo.provider);
                connectivityCount += 1;
            }
        }
    }

    for (let i of Object.keys(dataLoaded.connectivity.downstreams)) {
        for (let j of Object.keys(dataLoaded.connectivity.downstreams[i])) {
            let downstreamInfo = dataLoaded.connectivity.downstreams[i][j];
            if (!connectivityDuplicates.includes(downstreamInfo.name)) {
                connectivityDuplicates.push(downstreamInfo.name);
                connectivityCount += 1;
            }
        }
    }
    domConnectivityCounter.innerText = connectivityCount;

    /* Finally add dead endpoints */
    let domAliveCounter = document.querySelector("#counter-pop-alive");
    let domDeadCounter = document.querySelector("#counter-pop-dead");

    domAliveCounter.innerText = popInfoKeys.length - dataLoaded.popDead.length;
    domDeadCounter.innerText = dataLoaded.popDead.length;
};

const fetchDashboard = async (currentPage) => {
    document.querySelectorAll(".nav-scroller .nav-link").forEach(e => {
        e.classList.remove("active");
    });
    currentLink = document.querySelector(".nav-scroller .nav-link[href='#" + currentPage + "']")
    if (currentLink) {
        currentLink.classList.add("active");
    } else {
        currentLink = document.querySelector(".nav-scroller .nav-link[href='#infrastructure']")
        currentLink.classList.add("active");
    }

    document.querySelectorAll("[id^=page]").forEach(e => {
        e.classList.add("d-none")
    });
    document.querySelector("#loading-screen").classList.remove("d-none");

    /* Initialize Data */
    if (!dataLoadedComplete) {
        dataLoaded.connectivity = await fetchConnectivity();
        dataLoaded.prefixes = await fetchPrefixes();
        dataLoaded.infrastructure = await fetchInfrastructure();
        updateCounter();
        dataLoadedComplete = true;
    }

    switch (currentPage) {
        case "connectivity":
            document.querySelector("#page-connectivity").classList.remove("d-none");
            await renderConnectivity();
            break;

        case "prefixes":
            document.querySelector("#page-prefixes").classList.remove("d-none");
            await renderPrefixes();
            break;

        case "exchanges":
            document.querySelector("#page-exchanges").classList.remove("d-none");
            await renderExchanges();
            break;

        case "infrastrcutrure":
        default:
            document.querySelector("#page-infrastrcuture").classList.remove("d-none");
            await renderInfrastructure();
            break;
    }
    document.querySelector("#loading-screen").classList.add("d-none");
};

(() => {
    window.onhashchange = (event) => {
        if (!dataLoadedComplete) {
            return false;
        }
        let currentPage = location.hash.slice(1);
        fetchDashboard(currentPage);
    };
    fetchDashboard(location.hash.slice(1));
})();
