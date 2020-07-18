> :Hero src=https://tims.coding.blog/img/posts/cloud-computing/deliver-user-specific-notifications-on-ios-with-aws-sns/snsxnotifications-light.jpg,
>       mode=light,
>       target=desktop,
>       leak=156px

> :Hero src=https://tims.coding.blog/img/posts/cloud-computing/deliver-user-specific-notifications-on-ios-with-aws-sns/snsxnotifications-light-small.jpg,
>       mode=light,
>       target=mobile,
>       leak=96px

> :Hero src=https://tims.coding.blog/img/posts/cloud-computing/deliver-user-specific-notifications-on-ios-with-aws-sns/snsxnotifications-dark.jpg,
>       mode=dark,
>       target=desktop,
>       leak=156px

> :Hero src=https://tims.coding.blog/img/posts/cloud-computing/deliver-user-specific-notifications-on-ios-with-aws-sns/snsxnotifications-dark-small.jpg,
>       mode=dark,
>       target=mobile,
>       leak=96px

> :Title shadow=0 0 8px black, color=white
>
> Deliver user-specific notifications on iOS with AWS SNS

> :Author src=github

<br>

# 1. Introduction
[AWS's SNS](https://aws.amazon.com/de/sns) is very versatile and generally a good starting point for you when you need to send push notifications to your users. The free tier gives you one million notifications free **per month** and is relatively cheap when scaling up. One thing that has bugged me, though, was the lack of good guidance to quickly get something running. That's why I'm writing this posts, so you don't have to deal with clicking through more than two pages of Google search results.

# 2. What my project consists of
For this blog post, I'm using a combination of [express](https://github.com/expressjs/express), [Postgres](https://www.postgresql.org/) and [TypeORM](https://typeorm.io/) for my backend. My [starter template](https://github.com/ikkakujuu/suika) for express with TypeScript is still holding up well for small projects and TypeORM is easily integrated as well.

The iOS app is going to be a simple SwiftUI app, but this guide is mostly architecture-agnostic.

# 3. Setting up SNS
If you haven't done this already, you need to sign up for an AWS account. Inside the management console, you need to search for SNS.

There, you'll need to create a new platform application. Look under **mobile** and click create. Now, the tricky stuff happens (well, actually, you'll probably get used to it). 

## 3.1. Creating the push certificate
Inside [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list), add a new certificate. Select **Apple Push Notification service SSL (Sandbox & Production)**. This way, you don't need to create a new certificate for production. Continue and choose the right App ID. After that, you need to create a **Certificate Signing Request (CSR)**. See [Apple's guide](https://help.apple.com/developer-account/#/devbfa00fef7) on how to do it. After that, you should be able to download your new push certificate.

Install the new certificate and open **Keychain Access**. Go to **Keys** and look for the name you've given your CSR. Expand the private key, select both the private key and the new push certificate, right click with both selected and export them in *.p12* format.

Back inside the AWS management console, upload the *.p12* certificate, apply it and create the platform application.

Note down the **ARN** of the new endpoint.

## 3.2. Creating an IAM user
To use SNS in your backend, you need to create a new user under IAM as well. It's good to keep users coupled to what they're good for, so we're going to create a user just for our SNS purposes.

Inside the AWS management console, search for IAM, go to users and click **add user**. Choose a name you like, tick **programmatic access**. For permissions, choose **Attach existing policies directly** and search for SNS. Choose **AmazonSNSFullAccess**. Skip the tags and create the new user.

Download the credentials as CSV and note down both the **access key ID** as well as the **secret access key**.


# 4. Backend

So, now it's time for the backend! I'm assuming you have set up express with some authorization system and TypeORM (or any other database access layer).

## 4.1. Routes
For most basic purposes, we only need two routes: one to send the device token to SNS and another one to test our notifications later.

Inside where you add your routes, create the following routes:

```typescript | routes.ts
router.post('/register', authorize(), async (req, res) => { // --> Your authorize() method should probably add some user object to req
    if (req.body.deviceToken) {
        try {
            const subscription = await notificationService.subscribeNotifications(req.user, req.body.deviceToken); // --> We'll write this later

            return res.sendStatus(200);
        } catch (error) {
            console.error(error);

            return res.status(500).send({ code: 'REGISTRATION_ERROR', message: error.message });
        }
    }
});
```
This route will register the device with the supplied `deviceToken` with SNS. We'll write the `notificationService.subscribeNotifications` later!

```typescript | routes.ts
router.get('/test/:userId', async (req, res) => {
    await notificationService.notifyUser(parseInt(req.params.userId, 10)); // --> of course, we'll also take a look at this function later

    res.send({ message: 'ok' });
});
```
For obvious reasons, you should throw out this function once your code runs on production, but it's a good function to test your notification sending code.

## 4.2. Notification Service (Backend)

It's much less a service and more just a collection of functions to help us with registering for notifications.

First, we need to set up our connection with AWS. I recommend storing all your secrets and configuration in some config object, which loads them from environment variables. I will give you an example in another blog post sometime.

```typescript | notificationService.ts
const credentials = new AWS.Credentials({ accessKeyId: config.sns.accessKey, secretAccessKey: config.sns.secretAccessKey }); // --> the accessKey and secretAccessKey are the ones you've noted down before when creating the IMS user

AWS.config.update({credentials, region: config.sns.region }); // --> this is the region you've created your SNS stuff in

const sns = new AWS.SNS();
```

Let's take a look at this function: `subscribeNotifications(user: RequestUser, deviceToken: string)`

```typescript | notificationService.ts
async function subscribeNotifications(user: RequestUser, deviceToken: string) {
    const userTopicName = 'user-topic' + user.id; // --> we'll use the topic's name later to identify the user

    const topic = await sns.createTopic({ Name: userTopicName }).promise();

    // first, we created the topic
    if (topic.TopicArn) {
        const userEndpointAttributes = 'user-endpoint-' + user.id;

        // then, we create an endpoint where the device token will subscribe to
        const endpoint = await sns.createPlatformEndpoint({ PlatformApplicationArn: config.sns.arn, Token: deviceToken }).promise(); // --> the endpoint tells SNS "who" to reach, in our case a device specified by the deviceToken

        if (endpoint.EndpointArn) {
            const subscription = await sns.subscribe({ TopicArn: topic.TopicArn, Endpoint: endpoint.EndpointArn, Protocol: 'application' }).promise(); // --> the subscription basically connects our topic with the "client"

            if (subscription.SubscriptionArn) {
                const notificationSubscription = await saveToDatabase(user, userTopicName, topic.TopicArn); // --> we'll take a look at this later
            
                return notificationSubscription; // --> we don't necessarily need to return this to our client in the end. But if we ever want to give the user the ability to turn off notifications (without turning them off by removing permissions), we could store this somewhere inside the client to make it a bit easier
            }
            throw new Error('Could not create subscription');
        } else {
            throw new Error('Could not create endpoint');
        }
    } else {
        throw new Error('Could not create topic');
    }
}
```

Why are we saving the references to the database? It's easier to show you when we take a look at our test function:

```typescript | notificationService.ts
function makeMessage(title: string, message: string) {
    const apsContent = JSON.stringify( // --> It's important to stringify the APS payload, as it's invalid syntax otherwise
        {
            aps: {
                alert: { 
                    title,
                    body: message
                }
            }
        });

    return {
        'APNS_SANDBOX': apsContent, // --> APNS_SANDBOX is important if you're debugging in non-production environments, because otherwise you wouldn't receive any notifications. Trust me, it wasted an entire hour to figure out why my notifications wouldn't get delivered.
        'APNS': apsContent,
        'default': `${title}: ${message}`
    };
}

async function notifyUser(userId: number) {
    const subscription = await getSubscriptionFromDatabase(userId); // --> here, you should fetch our stored SNS topic/references by specifically getting the one for the user

    if (subscription) {
        const message = makeMessage('hello', 'hello from tims.coding.blog');
        const success = await sns.publish({ Message: JSON.stringify(message), MessageStructure: 'json', TopicArn: subscription.topicArn }).promise(); // --> the topicArn is used to identify our user here

        if (success.MessageId) {
            console.log('notified user with message id ' + success.MessageId);
        } else {
            console.log('could not notify user');
        }
    }

    // you should probably provide some fallback or so here
}
```


You may ask why I'm not just directly publishing to the endpoint. My reasoning for using the topic instead is that in many usecases you don't just want to reach one of the user's devices, but many instead. Then, we might have two endpoints because the user is logged in on both their iPad as well as their iPhone and they are able to receive the same notification on both devices. In that case, you'd need to alter the code where we create the topic, but that should be a minor step once everything else is done.

# 5. iOS App

For the iOS app, I'm assuming you have set up some sort of authentication services and integrated them inside your request pipeline. If you need some guides on how to build a simple API access layer, I recommend [this blog post](https://medium.com/swift2go/minimal-swift-api-client-9ea1c9c7946).

Inside the `AppDelegate`, we'll add a new function called `setupNotifications`:

```swift | AppDelegate.swift
extension AppDelegate {
    func setupNotifications(application: UIApplication) {
        if serviceRegistry.authService.isAuthorized() { // --> or whatever you use to check if the user is signed in
            let center = UNUserNotificationCenter.current()
            center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
                
                guard error != nil {
                    print(error)
                    return;
                }
                
                print("successfully requested push")
                
                DispatchQueue.main.async { // --> authorization is requested on a background thread, and we need to run registerForRemoteNotifications on the main thread
                    application.registerForRemoteNotifications()
                }
            }
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("registered for remote notifications")
        let token = deviceToken.reduce("", {$0 + String(format: "%02X", $1)}) // --> our backend requires a string, so we need to "convert" Data into a string
        
        serviceRegistry.notificationService.subscribeNotifications(deviceToken: token) { (success) in // --> this is where you call our backend API route with the deviceToken
            print(success ? "successfully subscribed to notifications" : "could not subscribe to notifications")
        }
    }
}
```

Now, we need to call this function when the app starts up. If you need to register somewhere else (after user onboarding, for example), you could access the application instance [as described here](https://stackoverflow.com/a/24114783/7735299).

```swift | AppDelegate.swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Override point for customization after application launch.
    self.setupNotifications(application: application)
    
    return true
}
```

That's it! When you call our test route with the right user id, a notification should show up on your device. It should be a real device, though, as push notifications are not supported inside the Simulator.

---

Thank you for reading this post! Feel free to reach out to me on [hey@timweiss.net](mailto:hey@timweiss.net)! I'd love to hear what you think of this post!