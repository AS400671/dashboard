var querybtn = document.querySelector("#route-graph-btn");
var loadingScreen = document.querySelector("#loading-screen-graph");
var log = document.querySelector("#route-graph-log");

var paths_cache = {};
var prefixes_cache = {};
var downstream_prefixes_cache = {};
var routeview_cache = {};
var asname_cache;
asname_cache = {};

var element;

const large_isps = [
    "7018", "3356", "3549", "3320", "3257", "6830", "2914", "5511", "3491", "1239",
    "6453", "6762", "12956", "1299", "701", "6461", "174", "7922", "6939", "9002",
    "1273", "2828", "4134", "4837"];

const external_sources = [
    { name: 'stat.ripe.net', url: 'https://stat.ripe.net/AS' },
    { name: 'bgp.he.net', url: 'https://bgp.he.net/AS' },
    { name: 'bgp.tools', url: 'https://bgp.tools/as/' },
    { name: 'bgpview.io', url: 'https://bgpview.io/asn/' },
    { name: 'radar.qrator.net', url: 'https://radar.qrator.net/AS' },
    { name: 'whois.ipip.net', url: 'https://whois.ipip.net/AS' }
];

const ignore_path = [
    (path) => false,
    (path) => !path.some(asn => large_isps.includes(asn)),
    (path) => false,
    (path) => false,
    (path) => false,
    (path) => false,
    // (path) => !path.some(asn => targets.value.replace(/(as| )/gi, '').split(',').includes(asn))
];

const draw_this = [
    (path, index) => index == 1,
    (path, index) => path.slice(index).some(asn => large_isps.includes(asn)),
    (path, index) => path.slice(index).some(asn => large_isps.includes(asn)) || index == 1,
    (path, index) => index != path.length - 1,
    (path, index) => index != path.length - 1 || index == 1,
    (path, index) => true,
    // (path, index) => path.slice(index).some(asn => targets.value.replace(/(as| )/gi, '').split(',').includes(asn))
];

var isElementXPercentInViewport = function (el, percentVisible) {
    var rect = el.getBoundingClientRect();
    var windowHeight = (window.innerHeight || document.documentElement.clientHeight);

    return !(
        Math.floor(100 - (((rect.top >= 0 ? 0 : rect.top) / +-(rect.height / 1)) * 100)) < percentVisible ||
        Math.floor(100 - ((rect.bottom - windowHeight) / rect.height) * 100) < percentVisible
    )
};

var m_log = function (msg) {
    console.log(msg);
    log.innerText = `[INFO ] ${msg}\n` + log.innerText;
}

var m_err = function (msg) {
    console.error(msg);
    log.innerText = `[ERROR] ${msg}\n` + log.innerText;
    alert(`ERROR: ${msg}`);
}

var render = async function (graph) {
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

var ripeGet = function (apiUrl) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', `https://stat.ripe.net/data/${apiUrl}`);
        xhr.onerror = () => reject('API: XHR failed. Check your input, or try again later.');
        xhr.onload = function () {
            if (this.status == 200) {
                res = JSON.parse(xhr.response);
                if (res.status === 'ok') resolve(res.data);
                else reject('API: RIPE API returned not-OK.');
            } else reject('API: got non-200 response.');
        };
        xhr.send();
    });
};

var renderByPrefixesOrAddresses = async function (poas, as) {
    querybtn.innerText = 'Loading paths...';
    var lvl = 6;
    var paths = [];
    as = as ? as : '';

    var peer_counts = {};
    var asns = {};
    var edges = {};
    var min_paths_val = 26;

    console.log(poas);

    if (poas.length == 1) {
        var poa = poas[0];

        document.getElementById('pfxinfo_title').innerText = poa;

        try {
            var [routing, irr, rir] = await Promise.all([
                ripeGet(`routing-status/data.json?resource=${poa}`),
                ripeGet(`prefix-routing-consistency/data.json?resource=${poa}`),
                ripeGet(`rir/data.json?resource=${poa}`)
            ]);

            var origin = routing.last_seen.origin;
            origin = origin ? origin.split(',') : [];

            if (origin.length > 0) document.getElementById('pfxinfo_asn').innerText = `Announced by ${origin.map(o => `AS${o}`).join(', ')}`;
            else document.getElementById('pfxinfo_asn').innerText = `Not announced`;

            document.getElementById('pfxinfo_rir').innerText = rir.rirs[0].rir;
            var irrtable = document.getElementById('pfxinfo_irrs');
            [...document.getElementsByClassName('pfxinfo_irr_item')].forEach(i => i.remove());

            irr.routes.forEach(r => {
                var tr = document.createElement('tr');
                tr.className = 'pfxinfo_irr_item';
                if (origin.includes(r.origin.toString()) && r.in_whois) tr.className += ' irr_valid';
                if (!r.in_bgp) tr.className += ' unannounced';

                var td_pfx = document.createElement('td');
                td_pfx.className = 'mono';
                var td_pfx_a = document.createElement('a');
                td_pfx_a.href = `#${r.prefix}`;
                td_pfx_a.onclick = () => doQuery(r.prefix);
                td_pfx_a.innerText = r.prefix;
                td_pfx.appendChild(td_pfx_a);
                tr.appendChild(td_pfx);

                var td_in_bgp = document.createElement('td');
                td_in_bgp.innerText = r.in_bgp ? 'Yes' : 'No';
                tr.appendChild(td_in_bgp);

                var td_in_whois = document.createElement('td');
                td_in_whois.innerText = r.in_whois ? 'Yes' : 'No';
                tr.appendChild(td_in_whois);

                var td_origin = document.createElement('td');
                td_origin.className = 'mono';
                var td_origin_a = document.createElement('a');
                td_origin_a.href = `#AS${r.origin}`;
                td_origin_a.onclick = () => doQuery(`AS${r.origin}`);
                td_origin_a.innerText = `AS${r.origin} ${r.asn_name}`;
                td_origin.appendChild(td_origin_a);
                tr.appendChild(td_origin);

                var td_irrs = document.createElement('td');
                td_irrs.className = 'mono';
                if (r.in_bgp) r.irr_sources.push('BGP');
                td_irrs.innerText = r.irr_sources.join(', ');
                tr.appendChild(td_irrs);

                irrtable.appendChild(tr);
            });

            prefixinfo.className = '';
            peerinfo.className = '';
        } catch (err) {
            m_err(err);
        }
    }

    await Promise.all(poas.map(async poa => {
        var cache_key = `${poa}${as}`;
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

    var links = new Set();
    var isp_cluster = new Set();

    var asns_arr = Object.keys(asns);
    m_log(`getPrefixesByAs: getting names for ${asns_arr.length} asn(s).`);
    m_log(`getPrefixesByAs: done.`);

    var nodes = new Set();
    var vertical_graph = false;
    var group_large_isps = false;

    Object.keys(edges).forEach(edge => {        
        var [src, dst] = edge.split(',');
        if (edges[edge] >= min_paths_val) {
            nodes.add(src);
            nodes.add(dst);
            var line = `AS${src}->AS${dst} [label = \"${edges[edge]}\"]`;
            if (group_large_isps && large_isps.includes(src)) isp_cluster.add(`AS${src}`);
            if (group_large_isps && large_isps.includes(dst)) isp_cluster.add(`AS${dst}`);
            links.add(line);
        }
    });

    var graph = `digraph Propagation{${vertical_graph ? '' : 'rankdir="LR";'}`;
    graph += `node[style="filled", shape=record, fillcolor="#112211", fontcolor=white, color="#223322", font="10pt"];`
    graph += `${Array.from(links).join(';')}${group_large_isps ? `subgraph cluster{label="Top-tier ISPs";${Array.from(isp_cluster).join(';')}}` : ''}}`;
    console.log(graph);
    await render(graph);
};

var renderByAs = async function (as) {
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

    if (!prefixes_cache[as]) {
        var rslt = await ripeGet(`announced-prefixes/data.json?resource=${as}`);
        prefixes = rslt.prefixes;
        prefixes_cache[as] = prefixes;
        m_log(`getPrefixesByAs: done, found ${prefixes.length} prefix(es).`);
    } else {
        prefixes = prefixes_cache[as];
        m_log(`getPrefixesByAs: done, found ${prefixes.length} prefix(es) (cached).`);
    }
    if (prefixes.length > 200) {
        return;
    }

    await renderByPrefixesOrAddresses(prefixes.map(p => p.prefix), as);
    if (downstream_prefixes.length > 0 && downstream_prefixes.length <= 5000) {
        await renderByPrefixesOrAddresses(downstream_prefixes);
    }

    if (downstream_prefixes.length > 5000) {
        // alert(`cannot determine downstreams of ${as}; it might be a feeder to one of the collectors, or have too many downstreams.`);
    }
};

renderByAs("400671");