const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");

const getDiscoveryMenu = () => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "responses", "discovery", "menu.json")).toString());
const getLatestMenu = () => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "responses", "discovery", "latest", "menu.json")).toString());

app.post("/fortnite/api/game/v2/creative/discovery/surface/*", (req, res) => {
    res.json(getDiscoveryMenu());
});

app.post("/api/v1/discovery/surface/*", (req, res) => {
    res.json(getDiscoveryMenu());
});

app.post("/api/v2/discovery/surface/*", (req, res) => {
    res.json(getDiscoveryMenu());
});

app.get("/fortnite/api/discovery/accessToken/*", (req, res) => {
    res.json({
        "branchName": req.params[0] || "unknown",
        "appId": "Fortnite",
        "token": "leilos-discovery-token"
    });
});

app.post("/links/api/fn/mnemonic", (req, res) => {
    res.json(getLatestMenu());
});

app.get("/links/api/fn/mnemonic/:playlist/related", (req, res) => {
    const playlist = req.params.playlist;
    const latestMenu = getLatestMenu();
    const linkData = latestMenu.find(i => i.mnemonic === playlist);
    
    res.json({
        "parentLinks": [],
        "links": linkData ? { [playlist]: linkData } : {}
    });
});

app.get("/links/api/fn/mnemonic/:playlist", (req, res) => {
    const playlist = req.params.playlist;
    const latestMenu = getLatestMenu();
    const linkData = latestMenu.find(i => i.mnemonic === playlist);
    
    if (linkData) {
        res.json(linkData);
    } else {
        res.status(404).end();
    }
});

app.post("/api/v1/fortnite-br/surfaces/*/target", (req, res) => {
    const id = "fortnite-br-br-motd-collection";
    res.json({
        contentType: "collection",
        contentid: id,
        tcid: id,
        contentMeta: `"${id}":[${id}]}`,
        contentItems: [
            {
                contentType: "content-item",
                contentid: id,
                tcid: id,
                contentFields: {
                    Buttons: [
                        {
                            Action: {
                                _type: "MotdDiscoveryAction",
                                category: "set_br_playlists",
                                islandCode: "set_br_playlists",
                                shouldOpen: true,
                            },
                            Style: "0",
                            Text: "Play Now",
                            _type: "Button",
                        },
                    ],
                    FullScreenBackground: {
                        Image: [
                            {
                                width: 1920,
                                height: 1080,
                                url: "https://cdn1.epicgames.com/offer/fn/Blade_2560x1440_2560x1440-95718a8046a942675a0bc4d27560e2bb",
                            }
                        ],
                        _type: "FullScreenBackground",
                    },
                    FullScreenBody: "LEILOS Backend",
                    FullScreenTitle: "LEILOS",
                    TeaserBackground: {
                        Image: [
                            {
                                width: 1024,
                                height: 512,
                                url: "https://cdn1.epicgames.com/offer/fn/Blade_2560x1440_2560x1440-95718a8046a942675a0bc4d27560e2bb",
                            },
                        ],
                        _type: "TeaserBackground",
                    },
                    TeaserTitle: "LEILOS",
                    VerticalTextLayout: false,
                },
                contentSchemaName: "DynamicMotd",
                contentHash: "c93adbc7a8a9f94a916de62aa443e2d6",
            },
        ],
    });
});

app.get("/fortnite/api/discovery/v1/surface/*", (req, res) => {
    res.json(getDiscoveryMenu());
});

app.post("/api/v1/assets/Fortnite/*", (req, res) => {
    const discoveryMenu = getDiscoveryMenu();
    res.json({
        "FortCreativeDiscoverySurface": {
            "meta": {
                "promotion": 1
            },
            "assets": {
                "CreativeDiscoverySurface_Frontend": {
                    "meta": {
                        "revision": 1,
                        "headRevision": 1,
                        "revisedAt": new Date().toISOString(),
                        "promotion": 1,
                        "promotedAt": new Date().toISOString()
                    },
                    "assetData": {
                        "AnalyticsId": "LEILOS",
                        "SurfaceName": "CreativeDiscoverySurface_Frontend",
                        "primaryAssetId": "FortCreativeDiscoverySurface:CreativeDiscoverySurface_Frontend",
                        "TestCohorts": [
                            {
                                "AnalyticsId": "LEILOS_COHORT",
                                "CohortSelector": "PlayerDeterministic",
                                "TestName": "testing",
                                "SelectionChance": 1.0,
                                "ContentPanels": discoveryMenu.Panels
                            }
                        ]
                    }
                }
            }
        }
    });
});

module.exports = app;
