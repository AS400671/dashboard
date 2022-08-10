/* Initially brought from internet.nat.moe; Unlicensed */

var querybtn = document.querySelector("#route-graph-btn");
var loadingScreen = document.querySelector("#loading-screen-graph");
var log = document.querySelector("#route-graph-log");

var api_cache = {};
var element;

const large_isps = [
    "7018", "3356", "3549", "3320", "3257", "6830", "2914", "5511", "3491", "1239",
    "6453", "6762", "12956", "1299", "701", "6461", "174", "7922", "6939", "9002",
    "1273", "2828", "4134", "4837"];

const draw_this = [
    (path, index) => index == 1,
    (path, index) => path.slice(index).some(asn => large_isps.includes(asn)),
    (path, index) => path.slice(index).some(asn => large_isps.includes(asn)) || index == 1,
    (path, index) => index != path.length - 1,
    (path, index) => index != path.length - 1 || index == 1,
    (path, index) => true,
];

const isElementXPercentInViewport = function (el, percentVisible) {
    var rect = el.getBoundingClientRect();
    var windowHeight = (window.innerHeight || document.documentElement.clientHeight);

    return !(
        Math.floor(100 - (((rect.top >= 0 ? 0 : rect.top) / +-(rect.height / 1)) * 100)) < percentVisible ||
        Math.floor(100 - ((rect.bottom - windowHeight) / rect.height) * 100) < percentVisible
    )
};

const m_log = function (msg) {
    /*
    console.log(msg);
    log.innerText = `[INFO ] ${msg}\n` + log.innerText;
    */
}

const m_err = function (msg) {
    /*
    console.error(msg);
    log.innerText = `[ERROR] ${msg}\n` + log.innerText;
    alert(`ERROR: ${msg}`);
    */
}

const render = async function (graph) {
    querybtn.innerText = 'Rendering...';

    m_log('render: request render...');
    var viz = new Viz();
    if (element) element.remove();
    try {
        element = await viz.renderSVGElement(graph);
        element.setAttribute('width', '100%');
        element.removeAttribute('height');
        display.appendChild(element);

        loadingScreen.classList.add("d-none");
        display.classList.remove("d-none");
        m_log('render: done.');
    } catch (err) {
        m_err(err);
    }
};

const ripeGet = function (apiUrl) {
    return new Promise((resolve, reject) => {
        
        if (!api_cache[apiUrl]) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', `https://stat.ripe.net/data/${apiUrl}`);
            xhr.onerror = () => reject('API: XHR failed. Check your input, or try again later.');
            xhr.onload = function () {
                if (this.status == 200) {
                    res = JSON.parse(xhr.response);
                    if (res.status === 'ok') {
                        api_cache[apiUrl] = res.data;
                        resolve(res.data);
                    } else reject('API: RIPE API returned not-OK.');
                } else reject('API: got non-200 response.');
            };
            xhr.send();
        }else{
            resolve(api_cache[apiUrl]);
        }
    });
};

const renderByPrefixesOrAddresses = async function (poas, as) {
    querybtn.innerText = 'Loading paths...';
    let paths = [];
    as = as ? as : '';

    let peer_counts = {};
    let asns = {};
    let edges = {};
    let min_paths_val = 26;

    m_log(poas);

    await Promise.all(poas.map(async poa => {
        try {
            m_log(`getGraphByPrefixesOrAddresses: constructing graph with prefix/IP ${poa}...`);

            m_log(`getGraphByPrefixesOrAddresses: fetching paths for ${poa} from RIPE RIS...`);
            var rslt = await ripeGet(`looking-glass/data.json?resource=${poa}`);
            var _paths = rslt.rrcs.map(rrc => rrc.peers).flat().map(peer => peer.as_path.split(' ').reverse());
            paths = paths.concat(_paths);
            m_log(`getGraphByPrefixesOrAddresses: found ${_paths.length} path(s) for ${poa} in RIPE RIS.`);

            m_log(`getGraphByPrefixesOrAddresses: done: ${poa}.`)
        } catch (e) {
            m_err(e);
        }
    }));

    paths.forEach(path => {
        var last;
        var pos = 0;
        path.forEach((asn, i, a) => {
            if (last && last != asn) {
                pos++;
                if (pos == 1) {
                    if (!peer_counts[asn]) peer_counts[asn] = 1;
                    else peer_counts[asn]++;
                }
                if (!asns[last]) asns[last] = 1;
                else asns[last]++;
                if (!asns[asn]) asns[asn] = 1;
                else asns[asn]++;
                if (!edges[`${last},${asn}`]) {
                    edges[`${last},${asn}`] = 1;
                } else edges[`${last},${asn}`]++;
            }
            last = asn;
        });
    });

    let links = new Set();
    let isp_cluster = new Set();

    let asns_arr = Object.keys(asns);
    m_log(`getPrefixesByAs: getting names for ${asns_arr.length} asn(s).`);
    m_log(`getPrefixesByAs: done.`);

    let nodes = new Set();
    let group_large_isps = true;
    Object.keys(edges).forEach(edge => {        
        let [src, dst] = edge.split(',');
        if (edges[edge] >= min_paths_val) {
            nodes.add(src);
            nodes.add(dst);
            let line = `AS${src}->AS${dst} [label = \"${edges[edge]}\", fontsize=8, arrowsize=.5, weight=${edges[edge]}]`;
            links.add(line);
        }
    });

    let graph = `digraph Propagation{rankdir="LR";`;
    graph += `node[style="filled", margin=0 width=0.8 height=0.25 , shape=record, penwidth=1, fillcolor="#336633", fontcolor=white, color="#223322", fontsize="10pt"];`
    graph += `${Array.from(links).join(';')}${group_large_isps ? `subgraph cluster{label="Top-tier ISPs";${Array.from(isp_cluster).join(';')}}` : ''}}`;
    m_log(graph);
    await render(graph);
};

const renderByAs = async function (as) {
    if(loadingScreen.classList.contains("d-none")){
        loadingScreen.classList.remove("d-none");
        display.classList.add("d-none");
    }

    querybtn.innerText = 'Loading prefixes...';
    var format_ok = false;

    as = as.toUpperCase();

    if (/^[1-9]+[0-9]*/.test(as)) {
        as = `AS${as}`;
        format_ok = true;
    }
    if (/^AS[1-9]+[0-9]*/.test(as)) format_ok = true;
    if (!format_ok) {
        throw 'getPrefixesByAs: bad ASN.';
    }

    m_log(`getPrefixesByAs: getting prefixes list for ${as}...`);

    var prefixes;
    var downstream_prefixes = [];

    var rslt = await ripeGet(`announced-prefixes/data.json?resource=${as}`);
    prefixes = rslt.prefixes;
    m_log(`getPrefixesByAs: done, found ${prefixes.length} prefix(es).`);
    if (prefixes.length > 200) {
        return;
    }

    await renderByPrefixesOrAddresses(prefixes.map(p => p.prefix), as);
    if (downstream_prefixes.length > 0 && downstream_prefixes.length <= 5000) {
        await renderByPrefixesOrAddresses(downstream_prefixes);
    }
};