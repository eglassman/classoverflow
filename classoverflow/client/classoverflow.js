Classes = new Meteor.Collection('classes');
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");

myScrollIntoView = function(result) {
    $('tr').removeClass('highlighted');
    $('#'+result).addClass('highlighted');
    var offset = $('#'+result).offset();
    $('html, body').animate({
        scrollTop: offset.top - 100
    },1000);    
}

loginAsEdxStudent = function(edxstudentID) {
    Meteor.call('loginAsEdxStudent',edxstudentID, function(error,result){
        if (error) {
            console.log('error on login as edx student',error);
        } else {
            Meteor.loginWithPassword(result.username,result.password,function(error){
                if (error) {
                    console.log('error logging in with password',error);
                }
            });
        }

    });
}

//ADD NOTFIRST ATTRIBUTES
//logic based on code here:
//http://stackoverflow.com/questions/28663936/looking-at-previous-item-in-handlebars-loop-meteorjs
function add_not_firsts(my_collection,filterObj,sortObj,coordNames){
    var my_fetched_collection = my_collection.find(filterObj,{sort: sortObj}).fetch()
    var previous_item = {}
    return _.map(my_fetched_collection, function(current_item) {
        // add an isAwesome property based on the previous kitten
        if (previous_item[coordNames[0]] === current_item[coordNames[0]]){
            current_item.coord0first = false;
            // current_item.coord1first = false;
            // current_item.coord2first = false;
            if (previous_item[coordNames[1]] === current_item[coordNames[1]]){
                current_item.coord1first = false;
                // current_item.coord2first = false;
                if (previous_item[coordNames[2]] === current_item[coordNames[2]]){
                    current_item.coord2first = false;
                } else {
                    current_item.coord2first = true;
                }
            } else {
                current_item.coord1first = true;
                current_item.coord2first = true;
            }
        } else {
            current_item.coord0first = true;
            current_item.coord1first = true;
            current_item.coord2first = true;
        }
        previous_item = current_item;
        return current_item
    });
}

//ROUTER CALLS
Router.route('/',{
    template: 'mainpage',
    waitOn: function() {
        return Meteor.subscribe('classes');
    },
    data: function(){
        return {'class_entries': Classes.find().fetch().sort({classtitle:1}) }
    },
    action: function () {
        if (!Meteor.user() && this.params.query.student_id) {
            loginAsEdxStudent(this.params.query.student_id);
        }
        if (this.ready()) {
            this.render();
        }
    }
});

Router.route('/class/:classtitle',{
    waitOn: function() {
        var classtitle = decodeURIComponent(this.params.classtitle);
        return [Meteor.subscribe('classes'),
                Meteor.subscribe('errors',classtitle),
                Meteor.subscribe('hints',classtitle)];
    },
    //template: 'classpage',
    action: function () {

        var classtitle = decodeURIComponent(this.params.classtitle);

        var class_entry = Classes.findOne({
            classtitle: classtitle
        });
        Session.set('class', classtitle);
        Session.set('numErrorCoords',class_entry['errorCoords'].length);

        //find or login with student id
        if (this.params.query.student_id){
            if (!Meteor.user()) {
                console.log('loggin in with student id')
                loginAsEdxStudent(this.params.query.student_id);
            }
        }
        Session.set('submitQ', false);
        
        var errorCoords = class_entry['errorCoords'];

        var sortObj = {};
        sortObj[errorCoords[0]['name']] = 1;
        sortObj[errorCoords[1]['name']] = 1;
        sortObj[errorCoords[2]['name']] = 1;

        var coordNames = [];
        coordNames.push(errorCoords[0]['name']);
        coordNames.push(errorCoords[1]['name']);
        coordNames.push(errorCoords[2]['name']);

        var filterObj = {};

        var num_errors = Errors.find(filterObj).count();
        if (num_errors===0) {
            var no_errors = true;
            var sorted_errors = add_not_firsts(Errors,{},sortObj,coordNames)
        } else {
            var no_errors = false;
            var sorted_errors = add_not_firsts(Errors,filterObj,sortObj,coordNames)
        }

        var dataObj = {
            'classtitle': classtitle,
            'level': 1,
            'errorCoords': errorCoords,
            'sorted_errors': sorted_errors,
            'no_errors': no_errors};
            
        if (this.ready()) {
            this.render('classpage',{
                data: function(){
                    return dataObj
                }
            }); 
        }
    }
});

Router.route('/class/:classtitle/:assignment',{
    waitOn: function() {
        var classtitle = decodeURIComponent(this.params.classtitle);
        return [Meteor.subscribe('classes'),
                Meteor.subscribe('errors',classtitle),
                Meteor.subscribe('hints',classtitle)];
    },
    action: function () {

        var classtitle = decodeURIComponent(this.params.classtitle);
        var assignment = decodeURIComponent(this.params.assignment);

        var class_entry = Classes.findOne({
            classtitle: classtitle
        });
        Session.set('class', classtitle);
        Session.set('numErrorCoords',class_entry['errorCoords'].length);

        //find or login with student id
        if (this.params.query.student_id){
            if (!Meteor.user()) {
                console.log('loggin in with student id')
                loginAsEdxStudent(this.params.query.student_id);
            }
        }
        Session.set('submitQ', false);
        
        var errorCoords = class_entry['errorCoords'];

        var sortObj = {};
        sortObj[errorCoords[0]['name']] = 1;
        sortObj[errorCoords[1]['name']] = 1;
        sortObj[errorCoords[2]['name']] = 1;

        var coordNames = [];
        coordNames.push(errorCoords[0]['name']);
        coordNames.push(errorCoords[1]['name']);
        coordNames.push(errorCoords[2]['name']);

        var filterObj = {};
        if (errorCoords[0]['inputType']==='int') {
            filterObj[errorCoords[0]['name']] = parseInt(assignment);
        } else if (errorCoords[0]['inputType']==='string') {
            filterObj[errorCoords[0]['name']] = assignment;
        } else {
            alert('unknown type in url');
        }
        
        var num_errors = Errors.find(filterObj).count();
        if (num_errors===0) {
            var no_errors = true;
            var sorted_errors = add_not_firsts(Errors,{},sortObj,coordNames)
        } else {
            var no_errors = false;
            var sorted_errors = add_not_firsts(Errors,filterObj,sortObj,coordNames)
        }

        var dataObj = {
            'classtitle': classtitle,
            'level': 2,
            'errorCoords': errorCoords,
            'assignment': assignment,
            'sorted_errors': sorted_errors,
            'no_errors': no_errors};
            
        if (this.ready()) {
            this.render('classpage',{
                data: function(){
                    return dataObj
                }
            }); 
        }
    }
});

Router.route('/class/:classtitle/:assignment/:testgroup',{
    waitOn: function() {
        var classtitle = decodeURIComponent(this.params.classtitle);
        return [Meteor.subscribe('classes'),
                Meteor.subscribe('errors',classtitle),
                Meteor.subscribe('hints',classtitle)];
    },
    action: function () {

        var classtitle = decodeURIComponent(this.params.classtitle);
        var assignment = decodeURIComponent(this.params.assignment);
        var testgroup = decodeURIComponent(this.params.testgroup);

        var class_entry = Classes.findOne({
            classtitle: classtitle
        });
        Session.set('class', classtitle);
        Session.set('numErrorCoords',class_entry['errorCoords'].length);

        //find or login with student id
        if (this.params.query.student_id){
            if (!Meteor.user()) {
                console.log('loggin in with student id')
                loginAsEdxStudent(this.params.query.student_id);
            }
        }
        Session.set('submitQ', false);
        
        var errorCoords = class_entry['errorCoords'];

        var sortObj = {};
        sortObj[errorCoords[0]['name']] = 1;
        sortObj[errorCoords[1]['name']] = 1;
        sortObj[errorCoords[2]['name']] = 1;

        var coordNames = [];
        coordNames.push(errorCoords[0]['name']);
        coordNames.push(errorCoords[1]['name']);
        coordNames.push(errorCoords[2]['name']);

        var filterObj = {};
        if (errorCoords[0]['inputType']==='int') {
            filterObj[errorCoords[0]['name']] = parseInt(assignment);
        } else if (errorCoords[0]['inputType']==='string') {
            filterObj[errorCoords[0]['name']] = assignment;
        } else {
            alert('unknown type in url');
        }
        if (errorCoords[1]['inputType']==='int') {
            filterObj[errorCoords[1]['name']] = parseInt(testgroup);
        } else if (errorCoords[1]['inputType']==='string') {
            filterObj[errorCoords[1]['name']] = testgroup;
        } else {
            alert('unknown type in url');
        }

        var num_errors = Errors.find(filterObj).count();
        if (num_errors===0) {
            var no_errors = true;
            var sorted_errors = add_not_firsts(Errors,{},sortObj,coordNames)
        } else {
            var no_errors = false;
            var sorted_errors = add_not_firsts(Errors,filterObj,sortObj,coordNames)
        }
        

        var dataObj = {
            'classtitle': classtitle,
            'level': 3,
            'errorCoords': errorCoords,
            'assignment': assignment,
            'testgroup': testgroup,
            'sorted_errors': sorted_errors,
            'no_errors': no_errors};

        if (this.ready()) {
            this.render('classpage',{
                data: function(){
                    return dataObj
                }
            }); 
        }
    }
});

Router.route('/class/:classtitle/:assignment/:testgroup/:testnum',{
    waitOn: function() {
        var classtitle = decodeURIComponent(this.params.classtitle);
        return [Meteor.subscribe('classes'),
                Meteor.subscribe('errors',classtitle),
                Meteor.subscribe('hints',classtitle)];
    },
    action: function () {

        var classtitle = decodeURIComponent(this.params.classtitle);
        var assignment = decodeURIComponent(this.params.assignment);
        var testgroup = decodeURIComponent(this.params.testgroup);
        var testnum = decodeURIComponent(this.params.testnum);

        var class_entry = Classes.findOne({
            classtitle: classtitle
        });
        Session.set('class', classtitle);
        Session.set('numErrorCoords',class_entry['errorCoords'].length);

        //find or login with student id
        if (this.params.query.student_id){
            if (!Meteor.user()) {
                console.log('loggin in with student id')
                loginAsEdxStudent(this.params.query.student_id);
            }
        }
        Session.set('submitQ', false);
        
        var errorCoords = class_entry['errorCoords'];

        var sortObj = {};
        sortObj[errorCoords[0]['name']] = 1;
        sortObj[errorCoords[1]['name']] = 1;
        sortObj[errorCoords[2]['name']] = 1;

        var coordNames = [];
        coordNames.push(errorCoords[0]['name']);
        coordNames.push(errorCoords[1]['name']);
        coordNames.push(errorCoords[2]['name']);

        var filterObj = {};
        if (errorCoords[0]['inputType']==='int') {
            filterObj[errorCoords[0]['name']] = parseInt(assignment);
        } else if (errorCoords[0]['inputType']==='string') {
            filterObj[errorCoords[0]['name']] = assignment;
        } else {
            alert('unknown type in url');
        }
        if (errorCoords[1]['inputType']==='int') {
            filterObj[errorCoords[1]['name']] = parseInt(testgroup);
        } else if (errorCoords[1]['inputType']==='string') {
            filterObj[errorCoords[1]['name']] = testgroup;
        } else {
            alert('unknown type in url');
        }

        if (errorCoords[2]['inputType']==='int') {
            filterObj[errorCoords[2]['name']] = parseInt(testnum);
        } else if (errorCoords[2]['inputType']==='string') {
            filterObj[errorCoords[2]['name']] = testnum;
        } else {
            alert('unknown type in url');
        }

        var one_error = false;
        var num_errors = Errors.find(filterObj).count();
        if (num_errors===0) {
            var no_errors = true;
            var sorted_errors = add_not_firsts(Errors,{},sortObj,coordNames)
        } else {
            var no_errors = false;
            var sorted_errors = add_not_firsts(Errors,filterObj,sortObj,coordNames)
            if (num_errors===1) {
                var one_error = true;
                var all_errors = add_not_firsts(Errors,{},sortObj,coordNames)
            }
        }
        
        var dataObj = {
            'classtitle': classtitle,
            'level': 4,
            'errorCoords': errorCoords,
            'assignment': assignment,
            'testgroup': testgroup,
            'testnum': testnum,
            'sorted_errors': sorted_errors,
            'no_errors': no_errors,
            'one_error': one_error,
            'all_errors': all_errors};

        if (this.ready()) {
            this.render('classpage',{
                data: function(){
                    return dataObj
                }
            }); 
        }
    }
});


Meteor.startup(function () {

    //Deploy edX version without settings.json
    if (Meteor.settings.public.CertAuthURL) {
        CertAuth.login();
        Session.set('certAuthEnabled',true);
    }
    Meteor.call('sendEmail','elg@mit.edu','a','b','c');
}); 

if (Meteor.isClient) {
    Accounts.ui.config({
        passwordSignupFields: 'EMAIL_ONLY', //"USERNAME_ONLY" restrictCreationByEmailDomain: 'school.edu',
        forceEmailLowercase: true
    });
    
    Template.registerHelper('log',function(){
        console.log('template logging',this);
    });

    Template.registerHelper('errorCoordsForAnError',function(){
        var curError = this;
        var title = Session.get('class');
        var coordVals = [];
        if (title) {
            var thisclass = Classes.findOne({
                classtitle: title
            });
            var route = '/class/'+encodeURIComponent(title);
            thisclass['errorCoords'].forEach(function(ec,ind){
                var field_name_first = 'coord'+ind.toString()+'first';
                route = route + '/' + encodeURIComponent(curError[ec['name']]);
                coordVals.push({
                    val: curError[ec['name']], 
                    placeholder: ec['placeholder'], 
                    first: curError[field_name_first],
                    route: route
                });
            });
            var lastCoord = coordVals[coordVals.length-1];
            lastCoord['last'] = true;
            coordVals[coordVals.length-1] = lastCoord;             
            return coordVals;
        } else {
            console.log('no title supplied');
        }
    });
    Template.registerHelper('certAuthEnabled',function(){
        return Session.get('certAuthEnabled');
    });

    Template.registerHelper('islevel',function(level,levelnumber){
        return level==levelnumber
    });
    
    Template.mainpage.helpers({
        class_entries: function () {
            return Classes.find().fetch();
        }
    });

    Template.error_row.helpers({
        hintsHelper: function () {
            return Hints.find({errorId:this._id}, {sort: {upvotes: -1, _id: 1}}).fetch();
        },
        ifRequested: function () {
            var errorId = this._id;
            if (Meteor.user()){
                if (Meteor.user().profile['requestedErrors'].indexOf(errorId) >= 0) {
                    return true;
                } 
            }
            return false;
        }
    });
    Template.addErrorBtn.events({
        "click .add-error": function(event){
            console.log('add-error button clicked',event)
            if (Meteor.userId()){
                $('#addErrorModal').modal('show');
            } else {
                $('#mySignInModal').modal('show');
            }
            return false;
        }
    });
    Template.addErrorModal.events({
        'click .submit-error': function(event){

            event.preventDefault();

            console.log('event.target', event.target)

            Meteor.call('addError',Session.get('class'),candidateErrorCoords,function(error,result){
                if (error) {
                    console.log('error during addError', error)
                } else {
                    $('#addErrorModal').modal('hide');
                }
            });
            return false;
        }
    });
    Template.addHintModal.events({
        "click .submit-hint": function(event){
            //event.preventDefault();
            console.log('.submit-hint clicked', event)
            console.log('event.target',event.target)
            var errorId = $(event.target).data('error-id');
            var hintText = $('#hint-text-for-'+errorId).val();
            console.log(hintText)

            Meteor.call('addHint',Session.get('class'),errorId,hintText,function(error,result){
                if (error) {
                    console.log('error in Meteor.addHint call',error) 
                } else {
                    $('#hint-text-for-'+errorId).val('');
                    $('#addHintModal-'+errorId).modal('hide');
                }
                
            });

            return false
        }
    });
    Template.errorTable.events({
        "click .add-hint": function(event){
            if (Meteor.userId()){
                var errorId = $(event.target).data('error-id');
                $('#addHintModal-'+errorId).modal('show');
            } else {
                $('#mySignInModal').modal('show');
            }
            return false;
        },
        "submit .new-hint-entry": function(event) {
            console.log(event)
            var hintText = event.target[0].value;
            var errorId = this._id;
            
            event.preventDefault();
            
            if ( $.trim( hintText ) == '' ) { // Check that it's not all whitespace
                return false;
            } else {

                if (Meteor.userId()) {

                    Meteor.call('addHint',Session.get('class'),errorId,hintText,function(error,result){
                        if (error) {
                            console.log('error in Meteor.addHint call',error) //log failure to add hint
                        } else {
                            event.target[0].value = ''; //clear the hint field on success
                        }
                        
                    });

                } else {
                    $('#mySignInModal').modal('show');
                }
            }
            return false;
        },
        "click .request": function (event) {

            if (Meteor.userId()) {
                Meteor.call('toggleRequest', Session.get('class'), this._id);
            } else {
                $('#mySignInModal').modal('show');
            }
            return false;
        }
    });
    Template.hint.helpers({
        ifUpvoted: function () {
            var hintId = this._id;
            if (Meteor.user()){
                if (Meteor.user().profile['upvotedHints'].indexOf(hintId) >= 0) {
                    return true;
                }
            }
            return false;
        }
    });
    Template.hint.events({
        "click .upvote": function(event){
            if (Meteor.userId()) {
                var hintId = this._id;
                Meteor.call('toggleUpvote',Session.get('class'),hintId);
            } else {
                $('#mySignInModal').modal('show');
            }
            return false;
        }
    });
    
    Template.errorCoord.onRendered(function () {
        Session.set('errorCoordsRendered',1+Session.get('errorCoordsRendered'));
        if (Session.get('submitQ') && Session.get('errorCoordsRendered')==Session.get('numErrorCoords')) {
            $('#find-add-error-btn').click();
            Session.set('submitQ',false)
        }
    });
    Template.navbar.helpers({
        errorCoords: function() {
            var title = Session.get('class');
            if (title) {
                var thisclass = Classes.findOne({
                    classtitle: title
                });
                var submitQ = true; //just the initialization

                Session.set('errorCoordsRendered',0);
                for (var ec in thisclass['errorCoords']) {
                    var coordval = Session.get(thisclass['errorCoords'][ec]['name']);
                    thisclass['errorCoords'][ec]['coordvalue'] = coordval;
                    if (coordval==undefined) {
                        submitQ = false;
                    }
                }
                Session.set('submitQ',submitQ);
                return thisclass['errorCoords'];
            } else {
                console.log('no title supplied');
            }
        }
    });
    
    Template.navbar.events({
        "submit .errorCoords-form": function (event) {
            event.preventDefault();

            var candidateErrorCoords = {};
            for (i = 0; i < event.target.length-1; i++) { //-1 so that i don't consider the submit button too.
                if (!event.target[i].value) {
                    alert('Please provide a value for all form fields.');
                    break;
                } else {
                    var coordVal = isNaN(parseInt(event.target[i].value)) ? event.target[i].value : parseInt(event.target[i].value);
                    candidateErrorCoords[event.target[i].name] = coordVal;
                }
            }

            console.log('candidateErrorCoords',candidateErrorCoords);
            registeredError = Errors.findOne(candidateErrorCoords);
            console.log('registeredError',registeredError)
            if (!registeredError) {
                if (Meteor.userId()) {
                    Meteor.call('addError',Session.get('class'),candidateErrorCoords,function(error,result){
                        if (error) {
                            console.log('error during addError', error)
                        } else {
                            myScrollIntoView(result);
                        }
                    });
                } else {
                    $('#mySignInModal').modal('show');
                }
            } else {
                myScrollIntoView(registeredError._id); 
            }
            
            return false;
        },
        "click .feedback": function (event) {
            console.log('feedback clicked')
        },
        "click .instructions": function (event) {
            console.log('instructions clicked')
        }
    });
}
