Remember: to run web service:
cd Marketplace-frontend, then npm run dev. 

Pages to make:
    Create Account
    Home
    Login
    NotFound
    Search Page
    Item Page


Possible ways to generate items on homepage:

on homepage, the user's 5 most recently viewed items are displayed on the 
homepage. 
    When a user clicks on an item, the web service grabs the users' current
    cookes, and adds the current item into the 'lastViewed' part of the cookie. 
    The 5th last item is removed to make room for this item. If, however, this
    item id is already in the cookie, nothing happens. 

When a user searches for an item, the words they search are segmented into tags. 
    eg. Kitchen Fridge = 'kitchen' + 'fridge'. 
This information is then added to the user's cookies, which 

Meeting notes for 28/8
- Started work on Items and how they are displayed
    ( demonstrate home page + item page)
    ( discuss ui elements)
    ( discuss grabbing data from url)
    ( discuss how the backend would work with the item page. )
- Started work on Searching for Items
    ( demonstrate basic functionality and url stuff)
    ( discuss intent to use external API for autocomplete in search bar)
    ( discuss how the backend would work with the item page. )