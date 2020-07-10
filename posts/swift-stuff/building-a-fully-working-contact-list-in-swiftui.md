> :Hero src=https://tims.coding.blog/img/posts/swift-stuff/building-a-fully-working-contact-list-in-swiftui/contactlist-large-light.png,
>       mode=light,
>       target=desktop,
>       leak=156px

> :Hero src=https://tims.coding.blog/img/posts/swift-stuff/building-a-fully-working-contact-list-in-swiftui/contactlist-small-light.png,
>       mode=light,
>       target=mobile,
>       leak=96px

> :Hero src=https://tims.coding.blog/img/posts/swift-stuff/building-a-fully-working-contact-list-in-swiftui/contactlist-large-dark.png,
>       mode=dark,
>       target=desktop,
>       leak=156px

> :Hero src=https://tims.coding.blog/img/posts/swift-stuff/building-a-fully-working-contact-list-in-swiftui/contactlist-small-dark.png,
>       mode=dark,
>       target=mobile,
>       leak=96px

> :Title shadow=0 0 8px black, color=white
>
> Building a fully working contact list in SwiftUI

> :Author src=github

<br>

## 1. Why this exists
In a recent project, I needed to build a contact list which displays all system contacts. While this wasn’t too hard to achieve, I had to incorporate a lot of stuff I have only learned about then, as I’m still relatively new to building iOS apps. The existing guides were either still for mainly UIKit based apps or only covered the basics.

## 2. Structure of the app
The user should  be able to do/see those things:
- Display all system contacts
- Search contacts
- Add a new contact
- Show “details” of a contact (precise definition later)
- Edit details of a contact

The interactions for our three views would flow this way:


> :DarkLight
> > :InDark
> >
> > ![App Interaction Flow](/img/posts/swift-stuff/building-a-fully-working-contact-list-in-swiftui/app-structure-dark.png)
>
> > :InLight
> >
> > ![App Interaction Flow](/img/posts/swift-stuff/building-a-fully-working-contact-list-in-swiftui/app-structure-bright.png)

So, let's jump into actually building stuff!

## 3. Fetching contacts

### 3.1. Requesting permissions
To fetch contacts, we use the [Contacts](https://developer.apple.com/documentation/contacts) API. As you may know, we first need to ask for permission to access the user’s contacts. This also requires us to add a string [describing the reason](https://developer.apple.com/documentation/bundleresources/information_property_list/nscontactsusagedescription) in `Info.plist`, otherwise the app would crash. Add an entry for the key `NSContactsUsageDescription`.

Now, we can request contact access permissions this way:

```swift
func fetchOrRequestPermission(completionHandler: @escaping (Bool) -> Void) {
    self.contactStore = CNContactStore.init()
    self.contactStore!.requestAccess(for: .contacts) { success, error in
        if (success) {
            completionHandler(true)
        } else {
            completionHandler(false)
        }
    }
}
```

Rightfully, you may ask what `self.contactStore` is for. We should wrap all our contact access functionality inside a class to access them in various places later. 

```swift | ContactService.swift
class ContactService {

	var contactStore: CNContactStore?

    func fetchOrRequestPermission(completionHandler: @escaping (Bool) -> Void) { 
        // see above
    }
}
```

In my real-world app, I use a kind of [singleton pattern](https://medium.com/better-programming/implement-a-service-oriented-architecture-in-swift-5-fc70b8117616). As we're not discussing app architecture in this post, however, anything goes. There are arguments for and against using such a pattern, but for now, it relieved more pain than it inflicted on building our app.

### 3.2. Fetching all contacts

Now, we are able to fetch the user's contacts. I will explain the code using comments inside so it's easier to follow around.

```swift | ContactService.swift
func getSystemContacts(completionHandler: @escaping ([Contact], Error?) -> Void) {
    self.fetchOrRequestPermission() { success in    // --> First, we need to make sure we have permission to fetch the contacts
        if (success) {
            do {
                let keysToFetch = [CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey] as [CNKeyDescriptor]    // --> The keysToFetch describe which content we actually want to access. It is good practice to keep this as limited as your app allows.
                
                var contacts = [CNContact]()

                let request = CNContactFetchRequest(keysToFetch: keysToFetch)

                try self.contactStore!.enumerateContacts(with: request) {
                    (contact, stop) in
                    contacts.append(contact)
                }
                
                func getName(_ contact: Contact) -> String { // --> see below for the Contact model and why we implement one
                    return contact.lastName.count > 0 ? contact.lastName : contact.givenName    // --> essentially, this is some sugar to order the contacts, as we often want to have them already ordered and not do it inside the model
                }
                    
                let formatted = contacts.compactMap({
                    // filter out all "empty" contacts
                    if ($0.phoneNumbers.count > 0 && ($0.givenName.count > 0 || $0.familyName.count > 0)) { // --> This is a fun one. On multiple different devices I have encountered those "empty contacts" where no information is stored for some reason. We don't need them so they're filtered out as well.
                        return Contact.fromCNContact(contact: $0)
                    }
                
                    return nil
                })
                        .sorted(by: { getName($0) < getName($1) }) // --> order by lastname/firstname
                    
                    completionHandler(formatted, nil)
            } catch {
                print("Failed to fetch contact, error: \(error)")
                completionHandler([], NSError()) // --> as a fallback, we return an empty array but we should capture the error elsewhere
            }
        } else {
            completionHandler([], NSError()) // --> also, please don't just return empty errors, I was lazy because I know where the error is coming from, but you maybe will not or can't remember why
        }
    }
}
```

### 3.3. The **Contact** model
By default, the Contacts API returns a [CNContact](https://developer.apple.com/documentation/contacts/cncontact). This is a great class and provides a versatile feature set. But to make it easier, I convert it into my own contact model to keep it concise and make the expectations clear for other developers on which fields they can expect to work with. This model will probably grow with your app (as it did for mine) but it's a good starting point. 

It's also good to put an abstraction between the layers in case you have some non-system sourced contacts like from your app's cloud-based address book.

```swift | Contact.swift
struct Contact {
    var id = UUID()
    var givenName: String
    var lastName: String
    
    var numbers: [PhoneNumber]
    
    var systemContact: CNContact? // --> This one is important! We keep a reference to later make it easier for editing the same contact.
    
    struct PhoneNumber { // --> We also have a PhoneNumber struct as they can have labels and we want to display them
        var label: String
        var number: String
    }
    
    init(givenName: String, lastName: String, numbers: [PhoneNumber], systemContact: CNContact) {
        self.givenName = givenName
        self.lastName = lastName
        self.numbers = numbers
        self.systemContact = systemContact
    }
    
    init(givenName: String, lastName: String, numbers: [PhoneNumber]) {
        self.givenName = givenName
        self.lastName = lastName
        self.numbers = numbers
    }
    
    static func fromCNContact(contact: CNContact) -> Contact {
        let numbers = contact.phoneNumbers.map({
            (value: CNLabeledValue<CNPhoneNumber>) -> Contact.PhoneNumber in
            
            let localized = CNLabeledValue<NSString>.localizedString(forLabel: value.label ?? "")
            
            return Contact.PhoneNumber.init(label: localized, number: value.value.stringValue)
            
        })
        
        return self.init(givenName: contact.givenName, lastName: contact.familyName, numbers: numbers, systemContact: contact)
    }
    
    func fullName() -> String {
        return "\(self.givenName) \(self.lastName)"
    }
}
```

That's it for fetching contacts! 

## 4. Main view
Let's get visual now. It's already time to build our first view. The main view (as in: the contact list) is the starting point of our app.

But actually, we'll start with the view model first and then use it to display our view. 

### 4.1. View model

```swift | ContactListViewModel.swift
import Foundation
import Contacts

class ContactListViewModel: ObservableObject {
    var contactService = ServiceRegistry.contactService // --> here, you pull in the ContactService we've built
    
    @Published var newContact = CNContact() // --> I'll come back to this later when we talk about editing and creating new contacts
    @Published var contacts: [Contact] = []
    @Published var showNewContact = false // --> This is for the modal
    @Published var noPermission = false // --> Also, we should display a hint when the user hasn't granted permission so they know what's going on

    @Published var searchText = "" // --> this is for the search we're going to implement
    
    init() {
        self.fetch()
    }
    
    func fetch() {
        self.contactService.getSystemContacts { (contacts, error) in
            guard error == nil else {
                self.contacts = []
                self.noPermission = true
                return
            }
            
            self.contacts = contacts // --> Because we're doing the heavy lifting inside the service, it takes almost no steps to fetch the contacts
        }
    }

    private func contactFilter(contact: Contact) -> Bool {
        if self.searchText.count == 0 {
            return true
        }
        
        return contact.fullName().localizedCaseInsensitiveContains(self.searchText)
    }
}
```

### 4.2. View

Now, let's take a look at the view displaying our lovely contacts.

```swift | ContactList.swift
import SwiftUI

struct ContactList: View {
    @ObservedObject var viewModel = ContactListViewModel()
    
    var body: some View {
         VStack {
            SearchBar(text: $searchText, placeholder: "Search contacts") // --> see below how to build this

            List {
                // Filtered list of names
                ForEach(contacts.filter { contactFilter(contact: $0)}, id:\.id) {contact in // --> We display all filtered contacts
                    NavigationLink(destination: ContactDetailView(contact: contact)) {
                        ContactItem(contact: contact)
                    }
                }
            }
            .modifier(ResignKeyboardOnDragGesture())
        }
    }
}
```

**So, what is actually happening here?**

### 4.3. ContactItem: Basic list item
SwiftUI makes it easy to break views into reusable components, so we tidy up our app a bit by putting `ContactItem` in a separate view.

```swift | ContactItem.swift
struct ContactItem: View {
    var contact: Contact
    
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 5) {
                Text(contact.givenName)
                Text(contact.lastName)
            }
        }
    }
}

```

### 4.4. SearchBar: Interfacing with UIKit

We're pulling in a `SearchBar`. This view will interface with UIKit and display the [`UISearchBar`](https://developer.apple.com/documentation/uikit/uisearchbar), which is already pre-made by Apple. Let's take a look.

I highly recommend taking a look at the [Interfacing with UIKit](https://developer.apple.com/tutorials/swiftui/interfacing-with-uikit) guide by Apple if you've never integrated a UIKit view before.

```swift | SearchBar.swift
import SwiftUI

struct SearchBar: UIViewRepresentable {
    @Binding var text: String
    var placeholder: String?

    class Coordinator: NSObject, UISearchBarDelegate {

        @Binding var text: String
        
        init(text: Binding<String>) {
            _text = text
        }

        func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
            text = searchText
        }
    }

    func makeCoordinator() -> SearchBar.Coordinator {
        return Coordinator(text: $text)
    }

    func makeUIView(context: UIViewRepresentableContext<SearchBar>) -> UISearchBar {
        let searchBar = UISearchBar(frame: .zero)
        searchBar.delegate = context.coordinator

        searchBar.autocapitalizationType = .none // --> here, we make some adjustments to the view so it better fits to our app
        searchBar.searchBarStyle = .minimal
        searchBar.placeholder = placeholder

        return searchBar
    }

    func updateUIView(_ uiView: UISearchBar, context: UIViewRepresentableContext<SearchBar>) {
        uiView.text = text
    }
}
```

That's it for the `SearchBar`, it provides us with all the functions we expect of a basic search bar. Also, we basically get search for free as seen in the view model.

Now, we should take a look at creating a new contact first before showing some details on our contacts, so I'll discuss `ContactDetailView` later.

## 5. Creating a new contact
It's time to add a button for contact creation now.

Add those modifiers to the `VStack` inside the `ContactList`:

```swift | ContactList.swift
.navigationBarItems(trailing:
    Button(action: { self.viewModel.showNewContact = true }) {
        Image(systemName: "person.crop.circle.badge.plus")
            .resizable()
            .scaledToFit()
            .frame(width: 20)
}
.sheet(isPresented: self.$viewModel.showNewContact, onDismiss: { self.viewModel.fetch() }) {
    NavigationView() {
        EditContactView(contact: self.$viewModel.newContact) // --> We'll get to that now
    }
}
.disabled(self.viewModel.noPermission)) // --> The user can't add any contacts inside our app if we have no permissions, so disable the button
```

### 5.1. EditContactView: Some more UIKit interfacing!
UIKit provides a view ([CNContactViewController](https://developer.apple.com/documentation/contactsui/cncontactviewcontroller)) we can use to create/edit contacts. This is great becasue we don't need to write our own and it makes sure that we can adapt to new versions of iOS relatively quickly.

It's mostly the same as for [4.4. SearchBar](#44-searchbar-interfacing-with-uikit), but obviously with some adjustments.

```swift | EditContactView.swift
import Foundation
import SwiftUI
import ContactsUI

struct EditContactView: UIViewControllerRepresentable {
    class Coordinator: NSObject, CNContactViewControllerDelegate, UINavigationControllerDelegate {
        func contactViewController(_ viewController: CNContactViewController, didCompleteWith contact: CNContact?) { // --> this gets called when the user taps done or cancels the editing/creation of a contact
            if let c = contact {
                self.parent.contact = c
            }
            
            viewController.dismiss(animated: true)
        }
        
        var parent: EditContactView

        init(_ parent: EditContactView) {
            self.parent = parent
        }
    }
    
    @Binding var contact: CNContact
    
    init(contact: Binding<CNContact>) {
        self._contact = contact
    }
    
    typealias UIViewControllerType = CNContactViewController
    
    func makeCoordinator() -> Coordinator {
        return Coordinator(self)
    }

    func makeUIViewController(context: UIViewControllerRepresentableContext<EditContactView>) -> EditContactView.UIViewControllerType {
        if self.contact.identifier.count != 0 { // --> for editing: here, we check if the contact is actually empty (so, a new one) or already exists
            do {
                let descriptor = CNContactViewController.descriptorForRequiredKeys()
                
                let store = CNContactStore()
                
                let editContact = try store.unifiedContact(withIdentifier: self.contact.identifier, keysToFetch: [descriptor])
                
                let vc = CNContactViewController(for: editContact) // --> if there's a contact we can edit, we disply the system's view for editing contacts
                vc.delegate = context.coordinator
    
                return vc
            } catch {
                print("could not find contact, this happens when we are trying to create a new contact that doesn't exist yet")
                print(error)
            }
        }
        
        let vc = CNContactViewController(forNewContact: CNContact()) // --> otherwise, we can assume that we want to create a new contact, so we display a fresh view
        vc.delegate = context.coordinator
        return vc
    }

    func updateUIViewController(_ uiViewController: EditContactView.UIViewControllerType, context: UIViewControllerRepresentableContext<EditContactView>) {
        
    }
}
```

With that, we are pulling in the contact editing view you already know from the phone app.

Also, that's already it for creating a new contact! SwiftUI really helps us to keep our code tidy.


## 6. Contact details view

We're almost done! Now, we want to display some details for the contacts we've fetched.
For this, we create `ContactDetailView`, as you've seen in `ContactList`.

Like with `ContactList`, let's first look at `ContactDetailViewModel`!


```swift | ContactDetailViewModel.swift
import Foundation
import Contacts

class ContactDetailViewModel: ObservableObject, Identifiable {
    @Published var contact: Contact
    @Published var showEditContactView = false
    
    init(contact: Contact) {
        self.contact = contact
    }
    
    func updateContact() { // --> When the user is done editing a contact, we inform our view to update the contact to show the newly edited content, so we fetch the updated version
        let contactStore = CNContactStore.init()
        let keysToFetch = [CNContactGivenNameKey, CNContactFamilyNameKey, CNContactPhoneNumbersKey] as [CNKeyDescriptor]
        
        do {
            let updated = try contactStore.unifiedContact(withIdentifier: self.contact.systemContact!.identifier, keysToFetch: keysToFetch)
            self.contact = Contact.fromCNContact(contact: updated)
        } catch {
            print(error)
        }
    }
}
```

It's time for the view! You've probably got the grip now on how it should go...

```swift | ContactDetailView.swift

import SwiftUI

struct ContactDetailView: View {
    @ObservedObject var viewModel: ContactDetailViewModel
    
    init(contact: Contact) {
        self.viewModel = ContactDetailViewModel(contact: contact)
    }
    
    var body: some View {
        Form() { // --> Form gives us a neat style to replicate the style we already know from the standard contacts app
            HStack() {
                Text(viewModel.contact.givenName)
                Text(viewModel.contact.lastName)
            }
            .padding(.vertical)
            .font(.system(.title))
            
            
            Section() {
                ForEach(viewModel.contact.numbers, id: \.number) { number in // --> here, we display all the numbers we got
                    Button(action: { /* do something */ }) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(number.label)
                                .font(.system(.subheadline))
                                .foregroundColor(.secondary)
                            Text(number.number)
                        }
                    }
                }
            }
        }
        .navigationBarItems(trailing:
            Button(action: { self.viewModel.showEditContactView = true }) {
                Text("Edit")
            }
            .disabled(self.viewModel.contact.systemContact == nil) // --> we don't want to let the user edit a non-system contact (like the aforementioned cloud-contacts, for example)
            .sheet(isPresented: self.$viewModel.showEditContactView) {
                NavigationView() {
                    EditContactView(contact: .constant(self.viewModel.contact.systemContact!)) // --> here, we pass the system contact we set in the beginning!
                }
                .onDisappear() {
                    self.viewModel.updateContact() // --> notify our view model to update the displayed contact
                }
            }
        )
    }
}
```

As before, we almost get all the heavy-lifting for free thanks to the vast capabilities UIKit already provides without the hassle thanks to SwiftUI!

## 7. Summary
What? Already done?

Yes, we've built all the stuff needed for a fully working [contact list](#42-view), [editing capabilities](#51-editcontactview-some-more-uikit-interfacing) and a [detail view](#6-contact-details-view) that you can pull into your app! Even if you have different use cases, it's not too much effort to adapt, as we did all the groundwork needed!

## 8. Building forward...
There's some stuff left we could pull into to make our contact list even more useful.

Some of those improvements include:
- Showing the profile image the user has set in the list and detail view
- Displaying more details like a contact's location (another way to interface with UIKit)
- Providing more ways to filter the list
- Grouping contacts by their name

Let's see, I may come back with some posts on how to do those things 😉

**Happy hacking!**

Got any thoughts, improvements or comments? Feel free to reach out to me on [hey@timweiss.net](mailto:hey@timweiss.net?subject=Contact%20List%20in%20SwiftUI)! I'd love to hear what you think of this post!


---
