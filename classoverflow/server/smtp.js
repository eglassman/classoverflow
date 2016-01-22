//based on http://lukaszkups.net/blog/0005_sending_emails_with_meteor/


Meteor.methods({
  sendEmail: function (studentEmail,errorString,errorLink,hint) {
  	console.log('checking strings')
    check(errorString, String);
    check(hint, String);
    check(errorLink, String);

    this.unblock();

    console.log('calling email send!')
    Email.send({
      to: studentEmail,
      from: 'class.overflow.beta@gmail.com',
      subject: 'New hints for resolving error '+errorString,
      text: 'Visit www.classoverflow.org to...'+hint+errorString
    });
  }
});