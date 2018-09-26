import $ from 'jquery';
import * as Cookies from "js-cookie";

var URL = "https://hack.battlecode.org";
var LEAGUE = 0

class Api {
    static setCache(url, data) {
        data['expiry_time'] = (new Date()).getTime() + 300000;
        window.sessionStorage.setItem(url, JSON.stringify(data));
        console.log("Store:");
        console.log(data);
    }

    static getCache(url) {
        var cachedResult = window.sessionStorage.getItem(url);
        console.log("getCache from url:");
        console.log(url);
        console.log(cachedResult);
        console.log((new Date()).getTime());
        if (cachedResult===null) {
            return null;
        } else {
            var parsedResult = JSON.parse(cachedResult);
            if ((new Date()).getTime() < parsedResult['expiry_time']) {
                console.log("Cache Hit");
                return parsedResult;
            } else {
                return null;
            }
        } 
    }

    static deleteCache(url) {
        window.sessionStorage.removeItem(url);
    }

    static getUpcomingDates(callback) {
        var new_state = [
            {id: 0, date: 'hi', data: 'message'},
            {id: 1, date: '24', data: 'message2'}
        ];

        callback(new_state);
    }

    static getTeamMuHistory(callback) {
        var data = [10,12,14,10,28,32,25,32];

        callback(data);
    }

    static getTeamWinStats(callback) {
        this.getUserTeam(function(team) {
            var stats = [team.wins, team.losses];
            callback(stats);
        });
    }

    static getUpdates(callback) {
        $.get(URL+"/api/league/"+LEAGUE+"/", function(data, success) {
            for (var i=0; i<data.updates.length; i++) {
                var d = new Date(data.updates[i].time);
                data.updates[i].date = d.toLocaleDateString();
                data.updates[i].time = d.toLocaleTimeString();
            }

            callback(data.updates);
        });
    }

    static search(query, callback) {
        $.get(URL+"/api/"+LEAGUE+"/team/?search="+encodeURIComponent(query), function(team_data, team_success) {
            $.get(URL+"/api/user/profile/?search="+encodeURIComponent(query), function(user_data, user_success) {
                callback(user_data.results, team_data.results);
            });
        });
    }

    static getUserTeam(callback) {
        $.get(URL+"/api/"+LEAGUE+"/team/?username="+encodeURIComponent(Cookies.get('username'))).done(function(data, status){
            if (data.results.length === 0) callback(null);
            else {
                Cookies.set('team_id',data.results[0].id);
                Cookies.set('team_name',data.results[0].name);
                $.get(URL+"/api/"+LEAGUE+"/team/"+data.results[0].id+"/").done(function(data, status) {
                    callback(data);
                });
            }
        }).fail(function(xhr, status, error) {
            callback(false);
        });
    }

    static updateTeam(params, callback) {
        $.ajax({
            url:URL+"/api/"+LEAGUE+"/team/"+Cookies.get('team_id')+"/",
            data:JSON.stringify(params),
            type:'PATCH',
            contentType:'application/json',
            dataType: 'json'
        }).done(function(data, status) {
            callback(true);
        }).fail(function(xhr, status, error) {
            callback(false);
        });
    }

    static acceptScrimmage(scrimmage_id, callback) {
        $.ajax({
            url:URL+"/api/"+LEAGUE+"/scrimmage/"+scrimmage_id+"/accept/",
            method:"PATCH"
        }).done(function(data, status) {
            callback(true);
        }).fail(function(xhr, status, error) {
            callback(false);
        });
    }

    static rejectScrimmage(scrimmage_id, callback) {
        $.ajax({
            url:URL+"/api/"+LEAGUE+"/scrimmage/"+scrimmage_id+"/reject/",
            method:"PATCH"
        }).done(function(data, status) {
            callback(true);
        }).fail(function(xhr, status, error) {
            callback(false);
        });
    }

    static getScrimmageRequests(callback) {
        this.getAllTeamScrimmages(function(scrimmages) {
            var requests = []
            for (let i=0; i<scrimmages.length; i++) {
                if (scrimmages[i].status !== "pending") continue;
                if (scrimmages[i].requested_by !== parseInt(Cookies.get('team_id'),10)
                    || scrimmages[i].blue_team === scrimmages[i].red_team) {
                    requests.push({
                        id:scrimmages[i].id,
                        team_id:scrimmages[i].requested_by,
                        team:(Cookies.get('team_name')===scrimmages[i].red_team)?scrimmages[i].blue_team:scrimmages[i].red_team
                    });
                }
            }
            callback(requests);
        });
    }

    static requestScrimmage(team_name, callback) {
        $.get(URL+"/api/"+LEAGUE+"/team/?search="+encodeURIComponent(team_name), function(team_data, team_success) {
            if (team_data.results.length === 0) return callback(false);
            $.post(URL+"/api/"+LEAGUE+"/scrimmage/", {
                red_team:Cookies.get('team_id'),
                blue_team:team_data.results[0].id,
                ranked:false
            }).done(function(data, status) {
                callback(true)
            }).fail(function() {
                callback(false);
            });
        });
    }

    static getAllTeamScrimmages(callback) {
        $.get(URL+"/api/"+LEAGUE+"/scrimmage/", function(data, succcess) {
            callback(data.results);
        });
    }

    static getReplayFromURL(url, callback) {
        $.get(url, function(data, succcess) {
            callback(JSON.parse(data.content));
        });
    }

    static getScrimmageHistory(callback) {
        let my_id = parseInt(Cookies.get('team_id'),10);
        this.getAllTeamScrimmages(function(s) {
            var requests = []
            for (let i=0; i<s.length; i++) {
                let on_red = s[i].red_team === Cookies.get('team_name');
                if (s[i].status === "pending" && s[i].requested_by !== my_id) continue;

                if (s[i].status === "redwon") s[i].status = on_red ? "won":"lost";
                else if (s[i].status === "bluewon") s[i].status = on_red ? "lost":"won";
                s[i].status = s[i].status.charAt(0).toUpperCase() + s[i].status.slice(1);

                s[i].date = new Date(s[i].updated_at).toLocaleDateString();
                s[i].time = new Date(s[i].updated_at).toLocaleTimeString();

                s[i].team = on_red ? s[i].blue_team : s[i].red_team;
                s[i].color = on_red ? 'Red' : 'Blue';

                requests.push(s[i]);
            } callback(requests);
        });
    }

    static getTournaments(callback) {
        var tournaments = [
            {'name':'sprint', 'challonge':'9023uhf'}
        ]

        callback(tournaments);
    }

    static createTeam(team_name, callback) {
        $.post(URL+"/api/"+LEAGUE+"/team/",{'name':team_name }).done(function(data, status){
            Cookies.set('team_id',data.id);
            Cookies.set('team_name',data.name);
            callback(true);
        }).fail(function(xhr, status, error) {
            callback(false);
        });
    }

    static joinTeam(secret_key, team_name, callback) {
        $.get(URL+"/api/"+LEAGUE+"/team/?search="+encodeURIComponent(team_name), function(team_data, team_success) {
            if (team_data.results.length === 0) return callback(false);
            $.ajax({
                'url':URL+"/api/"+LEAGUE+"/team/"+team_data.results[0].id+"/join/",
                'type':'PATCH',
                'data':{'team_key':secret_key }
            }).done(function(data, status){
                Cookies.set('team_id',data.id);
                Cookies.set('team_name',data.name);
                callback(true);
            }).fail(function(xhr, status, error) {
                callback(false);
            });
        });
    }

    static leaveTeam(callback) {
        $.ajax({
            'url':URL+"/api/"+LEAGUE+"/team/"+Cookies.get('team_id')+"/leave/",
            'type':'PATCH'
        }).done(function(data, status){
            callback(true);
        }).fail(function(xhr, status, error) {
            callback(false);
        });
    }

    static getUserProfile(callback) {
        var profileURL = URL+"/api/user/profile/"+encodeURIComponent(Cookies.get('username'))+"/";
        var data = Api.getCache(profileURL);
        if (data!==null) {
            callback(data);
            var userURLData = Api.getCache(data.url);
            if (userURLData!==null) {
                callback(userURLData);
            } else {
                $.get(data.url).done(function(userURLData, success) {
                    Api.setCache(data.url, userURLData);
                    callback(userURLData);
                }).fail(function(xhr, status, error) {
                    console.log(error);
                });
            }
        } else {
            $.get(profileURL).done(function(data, status) {
                Api.setCache(profileURL, data);
                Cookies.set('user_url', data.url);
                
                $.get(data.url).done(function(userURLData, success) {
                    Api.setCache(data.url, userURLData);
                    callback(userURLData);
                }).fail(function(xhr, status, error) {
                    console.log(error);
                });
            });
        }
    }

    static updateUser(profile, callback) {
        Api.deleteCache(URL+"/api/user/profile/"+encodeURIComponent(Cookies.get('username'))+"/");
        Api.deleteCache(Cookies.get('user_url'));

        $.ajax({
            url:Cookies.get('user_url'),
            data:JSON.stringify(profile),
            type:'PATCH',
            contentType:'application/json',
            dataType: 'json'
        }).done(function(data, status) {
            callback(true);
        }).fail(function(xhr, status, error) {
            callback(false);
        });
    }

    static loginCheck(callback) {
        $.ajaxSetup({
            headers: { 'Authorization': 'Bearer ' + Cookies.get('token') }
        });

        $.post(URL+"/auth/token/verify/", {
            token: Cookies.get('token')
        }).done(function(data, status){
            callback(true);
        }).fail(function(xhr, status, error) {
            callback(false);
        });
    }

    static logout(callback) {
        Cookies.set('token',"");
        Cookies.set('refresh',"");
        callback();
    }

    static login(username, password, callback) {
        $.post(URL+"/auth/token/", {
            username: username,
            password:password
        }).done(function(data, status){
            Cookies.set('token',data.access);
            Cookies.set('refresh',data.refresh);
            Cookies.set('username',username);
            
            $.ajaxSetup({
                headers: { 'Authorization': 'Bearer ' + Cookies.get('token') }
            });
            
            callback(true);
        }).fail(function(xhr, status, error) {
            callback(false);
        });
    }

    static register(email, username, password, first, last, dob, callback) {
        if ($.ajaxSettings && $.ajaxSettings.headers) {
            delete $.ajaxSettings.headers.Authorization;
        }

        $.post(URL+"/api/user/", {
            email: email,
            username:username,
            password:password,
            first_name:first,
            last_name:last,
            date_of_birth:dob
        }).done(function(data, status){
            this.login(username, password, callback);
            
        }.bind(this)).fail(function(xhr, status, error) {
            console.log("WHAT")
        });
    }

    static forgotPassword(email, callback) {
        callback(true);
    }

    static pushTeamCode(code, callback) {
        this.updateTeam({'code':code}, callback);
    }
}

export default Api;