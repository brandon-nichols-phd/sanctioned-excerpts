# Getting Started

- You will need to setup a personal token from github https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

- Install node >= 22
  - Recommended to install using `nvm`
- Run `npm run start:staging`
  - This will open in a new browser tab
- You will get an "unsafe" message from your browser. Click to allow

# Best practices

- Use prettier
  - npm install prettier -D --save-exact

# Troubleshooting

## If page doesn't load after 'npm run start:preprod'

    Your browser cache need to be cleared
    Steps: (for chrome)
        1. All the way to the right of the menu there will be 3 vertical dots, click it
        2. More Tools -> Clear Browsing Data
        3. Make sure browsing history, cookies and other site data, and cached images and files are selected
        4. press clear data
        5. If it doesn't solved your problem, select a longer time range
        6. close and restart chrome and try running 'npm start' again
