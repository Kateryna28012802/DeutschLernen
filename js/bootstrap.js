/* Start after all compatibility modules are available. */
if(user&&db.users[user.email])s=db.users[user.email].last;
view();
