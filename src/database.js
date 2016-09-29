import firebase from 'firebase'

function init(options) {
    var config = {
        apiKey: options.apiKey,
        databaseURL: `https://${options.name}.firebaseio.com`
    };

    firebase.initializeApp(config);
        if(config.apiKey) {
            firebase.auth().signInAnonymously().catch(function(error) {
            console.warn(error.message, error);
        });
    }   
    return firebase.database().ref()
}


let database = {
    init
}
export default database;