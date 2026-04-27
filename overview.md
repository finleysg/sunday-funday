# Sunday Fun Day App

My golfer friends want an app (mobile-first website) to track a weekly golf game among 8-24 players (the number range is not exact). The app will orchestrate the following steps.

1. Create a game and enter players
	- Each game needs a name
	- The course for the day must be selected (implies we have a separate setup section to create courses and tees)
	- Each game needs a format - to start we will support the following net games (meaning all games will use handicaps):
		- Stroke play
		- Stableford
		- Chicago 39
	- Add an optional skins competition
		- Support net skins or canadien skins
	- Players should be remembered once entered, so someone who played one week can be added to another game easily
	- Players can play different tees
	- Each player gets a number of shots for the round based on their handicap, but we won't have access to GHIN, so we will have the users simply enter the course handicap for that day
2. Create groups
	- This could happen ahead of time or at the last minute
	- We should be able to rearrange players as needed
	- Players should be able to find the game and their group since one player will be keeping score for the group
3. Enter scores
	- During play, each group would have a single score keeper
	- The app should make scoring as easy as possible
	- Player phones may lose connection - we need to use service workers to be resilient to connection issues
	- Players will want an option to see how other players are doing, so a leaderboard option will be nice
	- I see the ability to easily toggle between scoring and the leaderboard
4. Calculate results
	- This can re-use the leaderboard, sorted top to bottom
	- We will want an export to excel feature
5. Calculate side matches
	- Players might have a side bet with other players
	- We will only support nassau-style match play side bets to start
	- From the leaderboard, a user selects two players and requests a side bet calculation and the app will tell the user who won (front, back, total)


