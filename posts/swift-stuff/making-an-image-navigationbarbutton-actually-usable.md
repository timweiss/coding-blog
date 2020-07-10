> :Hero src=https://tims.coding.blog/img/posts/swift-stuff/making-an-image-navigationbarbutton-actually-usable/sfsymbols-large-bright.png,
>       mode=light,
>       target=desktop,
>       leak=156px

> :Hero src=https://tims.coding.blog/img/posts/swift-stuff/making-an-image-navigationbarbutton-actually-usable/sfsymbols-small-bright.png,
>       mode=light,
>       target=mobile,
>       leak=96px

> :Hero src=https://tims.coding.blog/img/posts/swift-stuff/making-an-image-navigationbarbutton-actually-usable/sfsymbols-large-dark.png,
>       mode=dark,
>       target=desktop,
>       leak=156px

> :Hero src=https://tims.coding.blog/img/posts/swift-stuff/making-an-image-navigationbarbutton-actually-usable/sfsymbols-small-dark.png,
>       mode=dark,
>       target=mobile,
>       leak=96px

> :Title shadow=0 0 8px black, color=white
>
> Making an Image navigationBarButton actually usable

> :Author src=github

<br>

## 1. Problem
SF Symbols is great for adding iconography, buttons and some images to your app. When using it to add a button for the navigation bar, however, the default settings result in the button being just a bit too small to be useful:

![Problem: Tappable area of button is too small](/img/posts/swift-stuff/making-an-image-navigationbarbutton-actually-usable/not-good.png)


## 2. Solution

### 2.1. ImageModifier
Fixing this (and making it **reusable**) just takes a `ViewModifier`. As we're dealing with an image, however, we actually need to first build an `ImageModifier`. This [answer on StackOverflow](https://stackoverflow.com/a/59534345/7735299) goes into detail about how and why, and here's the code:

```swift | ImageModifier.swift
// See: https://stackoverflow.com/a/59534345/7735299

import Foundation
import SwiftUI

protocol ImageModifier {
    /// `Body` is derived from `View`
    associatedtype Body: View

    /// Modify an image by applying any modifications into `some View`
    func body(image: Image) -> Self.Body
}

extension Image {
    func modifier<M>(_ modifier: M) -> some View where M: ImageModifier {
        modifier.body(image: self)
    }
}

```

We need to build our own `ImageModifier` because the default `ViewModifier` only takes 
``` swift
func body(content: View) -> some View
```
a `View` but the `.resizable()` modifier is only available on `Image` itself.

### 2.2. BarButtonModifier
Now, we can write our modifier to make the bar button more tappable.

We do that by making the frame wider `.frame(width: 25)` and add some padding on the side of the button `.padding(side == .leading ? .trailing : .leading, 20)`. We flip the side so a button on the trailing side of the navigation bar gets padding applied on the leading edge.

```swift | BarButtonModifier.swift
struct BarButtonModifier: ImageModifier {
    var side: Edge.Set = .trailing
    
    func body(image: Image) -> some View {
        image
            .resizable()
            .scaledToFit()
            .frame(width: 25)
            .padding(side == .leading ? .trailing : .leading, 20)
    }
}
```

With the `BarButtonModifier` done, we can finally apply it to our `Image`:

```swift
.navigationBarItems(trailing:
    Button(action: { self.viewModel.showNewContact = true }) {
        Image(systemName: "person.crop.circle.badge.plus")
            .modifier(BarButtonModifier())
    }
```

Now, our button has a way larger are, making it easier to tap:

![Solution: Button with bigger footprint](/img/posts/swift-stuff/making-an-image-navigationbarbutton-actually-usable/better.png)


**That's it!** Thank you for reading this post! Feel free to reach out to me on [hey@timweiss.net](mailto:hey@timweiss.net?subject=Contact%20List%20in%20SwiftUI)! I'd love to hear what you think of this post!