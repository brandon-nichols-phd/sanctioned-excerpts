# Pathspot iOS App

A react-native application for iOS, supports both iPad and iPhone.

## Building and Running

### Required Dependencies

- [Xcode](https://itunes.apple.com/us/app/xcode/id497799835) The easiest way to get Xcode and keep it updated is through the app store.
  - Ensure simulators are installed, which can be found in the "components" section of Xcode settings.
- [Node](https://nodejs.org/en) and its package manager `npm`. We're currently using Node 20 for this project.
- Ruby and Bundler, which both ship with macOS

Helpful Tools:

- [NVM](https://github.com/nvm-sh/nvm?tab=readme-ov-file) makes it easy to manage and switch between node versions
- [Homebrew](https://brew.sh/) makes it easy to install dependencies

### Building

Install Node dependencies. You can do this with:

```
npm install -g yarn
yarn install
```

Install Cocoapods and dependencies:

```
cd ios
bundle install
bundle exec pod install
```

Configure Xcode build:

- Open `ios/xcworkspace` in Xcode
- Select any SafetySuite scheme:
  - SafetySuite - production
  - SafetySuite demo - deprecated
  - SafetySuite preprod - deprecated
  - SafetySuite staging - production
- Select `Any iOS Simulator Device (x86_64)` from the "Run Destination" dropdown.

Symlink node from `/usr/local/bin`. _Depending on how you have Node installed and configured, this may not be necessary._

```
nvm use 20 # if using nvm
sudo mkdir /usr/local/bin
sudo ln -s $(which node) /usr/local/bin/node
```

Now clean and then build with (⇧ ⌘ K) and (⌘ B) or by selecting "Clean Build Folder" then "Build" from the product menu.

### Running

Start the server from the root project directory:

```
npm start
```

In Xcode, change your "run destination" to any iOS simulator and run.

### Additional Resources

- [React Native Getting Started](https://reactnative.dev/docs/getting-started)
  - Helpful for troubleshooting common setup errors

## Notes

    - Zebra:
        - Documentation: https://developer.zebra.com/blog/develop-react-native-printing-app-android-ios-link-os-sdk
        - Note: make sure you have java installed on your computer
    - VectorIcon with FontAwesome:
        - Documentation: https://aboutreact.com/react-native-vector-icons/

    Understanding ZPL for label templating:

        To Print:
            - device and printer have to be connected by bluetooth to print labels, otherwise printing won't be able to discover printer


        References:
            -   http://labelary.com/zpl.html
            -   http://labelary.com/viewer.html
            -   https://www.zebra.com/content/dam/zebra_new_ia/en-us/manuals/printers/common/programming/zpl-zbi2-pm-en.pdf
            -   for FB/TB: https://stackoverflow.com/questions/18512792/zebra-programming-language-zpl-ii-using-fb-or-tb-truncates-text-at-specific
                - TB: truncates words exceeding txt box sizes | height is in dots
                - FB: words wrap and fits excess into overlapping box | height is in lines
                    - both have word wrap functions


        Examples:
        - small box: ^FO50,300^GB400,100,4,3^FS
            - can add this above below text to wrap around it

        - solid line: ^FO50,500^GB700,3,3^FS

        - font size: ^CFA,24
            - changing the number value


        Coordinate System

            - ^FO - sets position of current to Field Origin (Top Left)
            - this takes two parameters (x,y)
            - TopLeft == ^FO0,0

        How to draw text:
            - ^FO 50, 60 ^A 0, 40 ^FD World's Best Griddle ^FS
            - has 4 commands:
                - ^FO
                    - Field origin
                - ^A
                    - allows us to customize the fond used to draw text
                    - can take up to 3 parameters
                        1. name/orientation
                        2. font height
                        3. font width
                - ^FB
                    - field Block
                    - allows you to print text into a dfined block type format
                    -formated and ^FD or ^SN string into a block of text using the
                        - origin
                        - font
                        - rotation specified for the text string
                        - also contains an automatic word  wrap function
                        - Format: ^FBa,b,c,d,e
                            - a
                                - width of text block line ( in dots)
                                - default value of 0
                            - b
                                - maximum number of lines in text block
                                - values = [-9999, 9999]
                                - changing the font size automatically inc/decr the size of the block
                            - c
                                - add/delete space between lines ( in dots )
                                - values = [-9999, 9999]
                            - d
                                - text justificaiton
                                - values:
                                    - L, C, R, J (justified)
                                    - default value is L
                            - e
                                - hanging indent of the second and remaining lines
                                - values [0, 9999]

                - ^FD
                    - sets field data
                - ^FS
                    - finished the current field and set the next field
                ^CFA, 12
                    - font size of 12 normal font wieght
                ^CF0,12 (weight specified here)
                    - bold font wieght with font size 12

        How to draw shapes:
            - draw a box with these three commands:
            1. ^FO - Field origin / positioning
            2. ^GB
                - indicates that the current field should draw a Graphical rectangle/box
                - width, height, thickness, color, orientation
            3. ^GC = graphical circle
            4. ^GE - graphical ellipses
            5. ^GD - graphical diagonal lines
            3. ^FS - Field Set

    Text editor documentation:
        - https://www.npmjs.com/package/react-native-pell-rich-editor
