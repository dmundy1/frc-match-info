// placeholder stuff, to be updated by api
let currentEvent = "..."
let alliance = "..." // a good starting value would be null, but that looks bad
let currentMatch = 0
let nextMatch = 0
let nextMatchTime = "..."
let queueTimeUnix = 0
let queueTime = "..."
let redAllianceTeams = ["...", "...", "..."]; 
let blueAllianceTeams = ["...", "...", "..."];

// to be used for api
const AUTH_KEY = "hqrPvAx8EiC4XDwgFPREFKEwwzsg3k6RPUudptM5SSh3Pz1ynKh3duhVaaZ1Xgvw"
const TEAM_NUMBER = "frc6911";
const MINS_TO_QUEUE = 20;
let EVENT_CODE = "" // temporary value of event code, hopefully updated by api

function updateApi() {

    console.log("updating api")

    // get the closest event
    fetch("https://www.thebluealliance.com/api/v3/team/" + TEAM_NUMBER + "/events/2023/simple", {
        mode: 'cors',
        headers: {
            "X-TBA-Auth-Key": AUTH_KEY
        }
    })
    .then(response => response.blob())
    .then(blob => {
        const reader = new FileReader();
        reader.onload = () => {
            const data = JSON.parse(reader.result);

            const today = new Date();
            let currentEventJson = null;
            let minDaysDiff = Infinity;
            
            for (const event of data) {
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date + "T23:59:59"); // 1 day of leeway, needed to not error out
                const daysDiffStart = Math.abs((startDate - today) / (1000 * 60 * 60 * 24));
                const daysDiffEnd = Math.abs((endDate - today) / (1000 * 60 * 60 * 24));
            
                // i honestly have no idea how this works, but it does
                if (daysDiffStart < minDaysDiff && startDate <= today && endDate >= today) {
                    minDaysDiff = daysDiffStart;
                    currentEventJson = event;
                }
                else if (daysDiffEnd < minDaysDiff && endDate >= today) {
                    minDaysDiff = daysDiffEnd;
                    currentEventJson = event;
                }
            }

            if (currentEventJson == null) {
                console.error("currentEventJson was null")
                alert("!! Error !! No events found");
                return;
            }

            currentEvent = currentEventJson.name;
            EVENT_CODE = currentEventJson.key;

            console.log("found current event: " + currentEvent)

            updateCurrentMatch()
        }
        reader.readAsText(blob);
    });
    
    function updateCurrentMatch() {
        fetch("https://www.thebluealliance.com/api/v3/event/" + EVENT_CODE + "/matches/simple", {
            mode: 'cors',
            headers: {
                "X-TBA-Auth-Key": AUTH_KEY
            }
        })
        .then(response => response.blob())
        .then(blob => {
            const reader = new FileReader();
            reader.onload = () => {
                const data = JSON.parse(reader.result);

                data.sort((a, b) => (a.match_number > b.match_number) ? -1 : 1)

                for (let i = 0; i < data.length; i++) {
                    if (data[i].actual_time != null) {
                        currentMatch = data[i].match_number + 1;
                        console.log("updated current match: " + currentMatch)
                        break;
                    }
                }
            }
            reader.readAsText(blob);

            getCurrentMatchInfo()
        });

        async function getTeamRanking(teamNumber) {
            console.log("getting team ranking for team " + teamNumber)

            const response = await fetch("https://www.thebluealliance.com/api/v3/team/frc" + teamNumber + "/event/" + EVENT_CODE + "/status", {
                mode: 'cors',
                headers: {
                    "X-TBA-Auth-Key": AUTH_KEY
                }
            });
            const data = await response.json();
            const rank = data.qual ? data.qual.ranking.rank : "N/A";
            return rank;
        }

        function getCurrentMatchInfo() {
            fetch("https://www.thebluealliance.com/api/v3/team/" +
            TEAM_NUMBER + "/event/" + EVENT_CODE + "/matches", {
                mode: 'cors',
                headers: {
                    "X-TBA-Auth-Key": AUTH_KEY
                }
            })
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                    reader.onload = ()  => {
                        const data = JSON.parse(reader.result);
                        let currentTime = new Date();
                        let currentUnixTime = currentTime.getTime() / 1000;
                        let closestMatch = null;
                        let closestMatchTimeDifference = null;
                    
                        for (let i = 0; i < data.length; i++) {
                            let matchTime = data[i].predicted_time;
                            let matchNumber = data[i].match_number;
                    
                            if (matchTime != null && matchNumber > currentMatch) {
                                let matchTimeDifference = matchTime - currentUnixTime;
                    
                                if (closestMatchTimeDifference === null || matchTimeDifference < closestMatchTimeDifference) {
                                    closestMatch = data[i];
                                    closestMatchTimeDifference = matchTimeDifference;

                                    if (closestMatchTimeDifference < 0) {
                                        console.error("closest match time difference is negative");
                                        alert("!! Error !! closest match time difference is negative");
                                        return;
                                    }

                                    if (closestMatch == null) {
                                        console.error("closest match is null");
                                        alert("!! Error !! closest match is null");
                                        return;
                                    }
                                }
                            }
                        }

                        (async function updateMatchAllianceInfo() {
                            if (closestMatch) {
                                console.log("updating match info")

                                nextMatch = closestMatch.match_number;
                                nextMatchTime = new Date(closestMatch.predicted_time * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                queueTimeUnix = closestMatch.predicted_time - (60 * MINS_TO_QUEUE);

                                console.log("next match: " + nextMatch)
                                console.log("next match time: " + nextMatchTime)
                                console.log("queue time: " + queueTimeUnix)

                                let tempRedAllianceTeams = [];
                                let tempBlueAllianceTeams = [];
                                
                                for (let i = 0; i < closestMatch.alliances.blue.team_keys.length; i++) {
                                    tempBlueAllianceTeams[i] = closestMatch.alliances.blue.team_keys[i].substring(3);
                                }
                                
                                for (let i = 0; i < closestMatch.alliances.red.team_keys.length; i++) {
                                    tempRedAllianceTeams[i] = closestMatch.alliances.red.team_keys[i].substring(3);
                                }
                                
                                alliance = tempRedAllianceTeams.includes(TEAM_NUMBER.replace("frc", "")) ? "red" : "blue";
                                
                                for (let i = 0; i < tempRedAllianceTeams.length; i++) {
                                    tempRedAllianceTeams[i] = {
                                        number: tempRedAllianceTeams[i],
                                        rank: await getTeamRanking(tempRedAllianceTeams[i])
                                    };
                                }
                                
                                for (let i = 0; i < tempBlueAllianceTeams.length; i++) {
                                    tempBlueAllianceTeams[i] = {
                                        number: tempBlueAllianceTeams[i],
                                        rank: await getTeamRanking(tempBlueAllianceTeams[i])
                                    };
                                }

                                console.log("all done")
                                
                                redAllianceTeams = tempRedAllianceTeams;
                                blueAllianceTeams = tempBlueAllianceTeams;
                            } else {
                                nextMatch = "N/A";
                                nextMatchTime = "N/A";
                                queueTime = "N/A";
                            }
                        })();
                    }
                reader.readAsText(blob);
            });
        }

    }
}   

let tempTime = null;

function updatePage() {
    const currentTimeElement = document.querySelector('.current-time');
    const currentTime = new Date();
    const formattedTime = currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    currentTimeElement.textContent = formattedTime;

    // there is probably a library for this, 
    // or a better way to do this, but we're 
    // looking to be importless

    queueTime = ""; // because of the +=, need to reset this every time or it will keep adding to the old value

    if (queueTimeUnix > currentTime.getTime() / 1000) {
        let timeUntilQueue = queueTimeUnix - (currentTime.getTime() / 1000);
        let date = new Date(timeUntilQueue * 1000);
        
        let hours = date.getUTCHours();
        let minutes = date.getUTCMinutes();
        let seconds = date.getUTCSeconds();
                
        if (hours > 0) {
          queueTime += hours.toString().padStart(2, "0") + ":";
        }
        
        queueTime += minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");        
    } else {
        queueTime = "00:00";
    }
  
    // update current event
    const currentEventElement = document.querySelector('.current-event');
    currentEventElement.textContent = currentEvent;

    // update current match
    const currentMatchElement = document.querySelector('.current-match');
    // the way the bold is done should be illegal
    currentMatchElement.innerHTML = "Current Match:<br><span>Qualification " + currentMatch + "</span>";
    
    // update next match
    const nextMatchElement = document.querySelector('.next-match');
    nextMatchElement.innerHTML = "Next Match:<br><span>Qualification " + nextMatch + " @ " + nextMatchTime + "</span>";

    // update next match time
    const timeUntilElement = document.querySelector('.time-until');
    timeUntilElement.innerHTML = queueTime + "<span>until<br>queue</span>";

    // update alliance title
    if (alliance != "...") {
        const allianceTitleElement = document.querySelector('.alliance-title');
        const redAlliance = alliance === 'red';
        allianceTitleElement.textContent = redAlliance ? 'Red Alliance' : 'Blue Alliance';
        allianceTitleElement.style.color = redAlliance ? 'red' : 'blue';
    }
  
    // update alliance teams
    const allianceElement = document.querySelector('.alliance');
    const teamBoxes = allianceElement.querySelectorAll('.team-box');
    const totalTeams = redAllianceTeams.length + blueAllianceTeams.length;

    for (let i = 0; i < totalTeams; i++) {
        const team = i < redAllianceTeams.length ? redAllianceTeams[i] : blueAllianceTeams[i - redAllianceTeams.length];
        teamBoxes[i].textContent = team.number != undefined && team.rank != undefined ? team.number + " (" + team.rank + ")" : "N/A";
    }
  }
  
  updateApi()
  updatePage();
  setInterval(updatePage, 1000);
  setInterval(updateApi, 30000);