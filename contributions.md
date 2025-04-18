# Contributions

Every member has to complete at least 2 meaningful tasks per week, where a
single development task should have a granularity of 0.5-1 day. The completed
tasks have to be shown in the weekly TA meetings. You have one "Joker" to miss
one weekly TA meeting and another "Joker" to once skip continuous progress over
the remaining weeks of the course. Please note that you cannot make up for
"missed" continuous progress, but you can "work ahead" by completing twice the
amount of work in one week to skip progress on a subsequent week without using
your "Joker". Please communicate your planning **ahead of time**.

Note: If a team member fails to show continuous progress after using their
Joker, they will individually fail the overall course (unless there is a valid
reason).

**You MUST**:

- Have two meaningful contributions per week.

**You CAN**:

- Have more than one commit per contribution.
- Have more than two contributions per week.
- Link issues to contributions descriptions for better traceability.

**You CANNOT**:

- Link the same commit more than once.
- Use a commit authored by another GitHub user.

---

## Contributions Week 1 - [26.3.] to [2.4.]

| **Student**          | **Date** | **Link to Commit** |  **Description**                                                                                                                    | **Relevance**                                                                                                   |
|----------------------|--------| ------------- |-------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| **[jojo2-8902]**     | [29.03] | [https://github.com/Janosch123123/sopra-fs25-group-23-client/commit/2ca7bfbbb3870f78f7e6f1834c834c76d612fd7b] | [Check if user is allowed to access this page]                                                                                | [authentication]                                                                                                |
|                      | [30.03] | [https://github.com/Janosch123123/sopra-fs25-group-23-client/commit/e17326d08b70b6d2790a71ed50a558ad13df5027]| [create homepage]                                                                                                             | [homepage is needed]                                                                                            |
| **[MarcMahler]**     | 29.03  | https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/d5c5799645149d4f3e50f5abfb412a3441022eb0 | #16 I adjusted the user repository and the database connection such that the user stats get saved with the corresponding user | store Player statistics                                                                                         |
|                      | 30.03  | https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/d5c5799645149d4f3e50f5abfb412a3441022eb0 | #21 I adjusted several API endpoints as GET /users/id , which now sends the user with the statistics in json format in body   | Send new statistics to FE                                                                                       |
| **[@LuckyLuke637]**  | [29.03] | [https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/6d8b4b112629d6592c832d4af0b5db3cd851b706] | [Websocket Service]                                                                                                           | [Created the lobby service for websocket in the backend]                                                        |
|                      | [30.03] | [[https://github.com/Janosch123123/sopra-fs25-group-23-client/commit/f0dcde300f0cc8473f4d94677f763fa4bca9ea90] | [Websocket Service]                                                                                                           | [Created the lobby service for websocketin the frontend]                                                        |
| **[@Janosch123123]** | [31.3.] | [https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/8f183ced7937add4f7110b7b61e5cd9d20de2fb4] | [creading Rest endpoints for validating users]                                                                                | [make it more secure, doont send the password anymore.]                                                         |
|                      | [31.3] | [https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/d74a76b5422ddefb7c516615b6c83bf940d6b750] | [cleand the whole backend up, removed legacy code from M1, and also better styling]                                           | [So that we are not confused by bad code in the backend, (a lot of this was done in the commit above as well!)] |
| **[@StalyTV]** | [02.04.]   | [https://github.com/Janosch123123/sopra-fs25-group-23-client/commit/d2050f7257900455c4e8fdab2ab3a12f3b43aded] | [This User Story focused on implementing the login and register functionality. A lot of it could be reused form Milestone 1. Major Changes to Design were made] | [Making the Implementation look smooth and make registered and logged in Users get pushed to /home page] |
|                    | [02.04.]   | [https://github.com/Janosch123123/sopra-fs25-group-23-client/commit/7e1a11d6238171aef1c02621dff5362f3c28199d] | [Fixed Linting Errors from S1 and S2] | [Making the client deployable for online purposes] |
---

## Contributions Week 2 - [3.4.] to [9.4.]

| **Student**                       | **Date** | **Link to Commit** | **Description**                                                                                                                            | **Relevance**                                                                       |
|-----------------------------------|----------| ------------------ |--------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| **[@Janosch123123/@JanoschBeck]** | [4.4]    | [https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/728a8174c9129911a1325b1e77facefc2aa3b1e2] | [backend validates the lobby code sent via websocket and stores the user with lobby code if valid. + send appropriate response]            | [users can join the lobby]                                                          |
|                                   | [7.4.]   | [https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/f2934f4d03965ad5ae4c953010b4d08874e25023] | [websocket broadcasting to all users in a lobby without them sending a request]                                                            | [with this we can make use of webnsockets and update the lobby state or game state] |
|                                   | [8.4.]   | [https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/383993fdaa56a5aca689edcec132cf47f313fc04] | [generally I implemented a move methode for the snake to move in the direction the users sends]                                            | [players can moce their snake and play a first version of the game!]                |
| **MarcMahler**                    | 5.4      | https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/77c2c920a89d119dafacf3b30b94a6b79c8b7dd3 | #33 imlemented the general game object with all snakes and items in it. Also the start button had to actually create a game in the backend | To start a game (through websocket connection)                                      |
|                                   | 7.4      | https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/6f4debf47444da2fe95de692d1184842e2276399 | Made a while loop (game loop) to frequently broadcast the gamestate #34 + made the right broadcast for the FE #35                          | that the FE can desplay the gameState correctly.                                    |
| **@LuckyLuke637**                | [3.4]   | [[https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/3adea21270ec62c965f4b628956ab277370f14c7] | [Created the lobby entity in the backend and connect it with the user entity]                                                                                                            | [To keep track of who is in the lobby and how it changes when someone leaves]                                                 |
|                                   | [7.4]   | [https://github.com/Janosch123123/sopra-fs25-group-23-server/commit/e970e256f3a804214b069efec399feb38aaae7d9] | [Frontend get lobby state from the backend via websocket connection]                                                                                                            | [User now sees the rendered version of the lobby he is in in the frontend]                                                 |
| **[@jojo2-8902]**                | [06.04]   | [https://github.com/Janosch123123/sopra-fs25-group-23-client/commit/6a0735c2eda0e535c575e83f2371e7fb219ad301] | [create lobby button]                                                                                                            | [to create a lobby]                                                 |
|                                   | [08.04]   | [https://github.com/Janosch123123/sopra-fs25-group-23-client/commit/7d071e4a118c83e37d558755fcc4ad35283139b1] | [established websocket connection]                                                                                                            | [to be able to communicate between front and backend]                                                 |
| **[@githubUser5]**                | [date]   | [Link to Commit 1] | [Brief description of the task]                                                                                                            | [Why this contribution is relevant]                                                 |
|                                   | [date]   | [Link to Commit 2] | [Brief description of the task]                                                                                                            | [Why this contribution is relevant]                                                 |

---

## Contributions Week 3 - [Begin Date] to [End Date]

_Continue with the same table format as above._

---

## Contributions Week 4 - [Begin Date] to [End Date]

_Continue with the same table format as above._

---

## Contributions Week 5 - [Begin Date] to [End Date]

_Continue with the same table format as above._

---

## Contributions Week 6 - [Begin Date] to [End Date]

_Continue with the same table format as above._
