// placeholder stuff, to be updated by api
let currentEvent = "..."
let alliance = "red"
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
let EVENT_CODE = ""

function updateApi() {

    /*


    def get_events():
        url = f"https://www.thebluealliance.com/api/v3/team/{TEAM}/events/{YEAR}/simple"
        headers = {"X-TBA-Auth-Key": AUTH_KEY}
        response = requests.get(url, headers=headers)
        return response.json()

    def get_match_info(event):
        url = f"https://www.thebluealliance.com/api/v3/team/{TEAM}/event/{event}/matches"
        headers = {"X-TBA-Auth-Key": AUTH_KEY}
        response = requests.get(url, headers=headers)

        print(url)
        
        return response.json()

    def find_closest_event(events):
        today = datetime.today().date()
        closest_event = None
        min_days_diff = float("inf")

        for event in events:
            end_date = datetime.strptime(event["end_date"], "%Y-%m-%d").date()
            days_diff = abs((end_date - today).days)

            if days_diff < min_days_diff:
                min_days_diff = days_diff
                closest_event = event

        print(closest_event)

        return closest_event

    def get_team_info(team):
        url = f"https://www.thebluealliance.com/api/v3/team/frc{team}"
        headers = {"X-TBA-Auth-Key": AUTH_KEY}
        response = requests.get(url, headers=headers)
        return response.json()

    def get_team_status(team):
        url = f"https://www.thebluealliance.com/api/v3/team/frc{team}/event/{EVENT_CODE}/status"
        headers = {"X-TBA-Auth-Key": AUTH_KEY}
        response = requests.get(url, headers=headers)

        return response.json()

    def parse_rank(ranking_str):
        rank = int(re.search(r"Rank (\d+)", ranking_str).group(1))
        score = re.search(r"(\d+-\d+-\d+)", ranking_str).group(0)
        return rank, score

    def print_team_ranking(team, color):
        status = get_team_status(team)
        ranking_str = status["overall_status_str"]

        rank, score = parse_rank(ranking_str)

        cprint(f"{team}: Rank {rank}, {score}", color, attrs=['bold'] if rank <= 8 else [])
    */

    // get the closest event
    fetch("https://www.thebluealliance.com/api/v3/team/" + TEAM_NUMBER + "/events/2023/simple", {
        mode: 'cors',
        headers: {
            "X-TBA-Auth-Key": AUTH_KEY
        }
    })
    .then(response => response.blob())
    .then(blob => {
        console.log(blob)

        const reader = new FileReader();
        reader.onload = () => {
            const data = JSON.parse(reader.result);

            const today = new Date();
            let currentEventJson = null;
            let minDaysDiff = Infinity;
            
            for (const event of data) {
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date);
                const daysDiffStart = Math.abs((startDate - today) / (1000 * 60 * 60 * 24));
                const daysDiffEnd = Math.abs((endDate - today) / (1000 * 60 * 60 * 24));
            
                if (daysDiffStart < minDaysDiff && startDate <= today && endDate >= today) {
                    minDaysDiff = daysDiffStart;
                    currentEventJson = event;
                }
                else if (daysDiffEnd < minDaysDiff && endDate >= today) {
                    minDaysDiff = daysDiffEnd;
                    currentEventJson = event;
                }
            }

            currentEvent = currentEventJson.name;
            console.log(currentEventJson)
            EVENT_CODE = currentEventJson.key;

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
                        break;
                    }
                }
            }
            reader.readAsText(blob);

            getCurrentMatchInfo()
        });

        async function getTeamRanking(teamNumber) {
            console.log("getting team ranking for " + teamNumber)

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

        function getCurrentMatchInfo()
        {
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
                                }
                            }
                        }

                        (async function updateMatchAllianceInfo() {

                            if (closestMatch) {
                                nextMatch = closestMatch.match_number;
                                nextMatchTime = new Date(closestMatch.predicted_time * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                // 20 mins before match
                                queueTimeUnix = closestMatch.predicted_time - 1200;

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
                                    console.log(tempBlueAllianceTeams[i]);
                                }
                                
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

function updatePage() {
    const currentTimeElement = document.querySelector('.current-time');
    const currentTime = new Date();
    const formattedTime = currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    currentTimeElement.textContent = formattedTime;

    // queue time calculation (todo: make this better)
    if (queueTimeUnix > currentTime.getTime() / 1000) {
        let timeUntilQueue = queueTimeUnix - (currentTime.getTime() / 1000);
        let minutes = Math.floor(timeUntilQueue / 60);
        let seconds = Math.floor(timeUntilQueue % 60);
        seconds = seconds < 10 ? "0" + seconds : seconds;
        queueTime = minutes + ":" + seconds;
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
    const allianceTitleElement = document.querySelector('.alliance-title');
    const redAlliance = alliance === 'red';
    allianceTitleElement.textContent = redAlliance ? 'Red Alliance' : 'Blue Alliance';
    allianceTitleElement.style.color = redAlliance ? 'red' : 'blue';
  
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