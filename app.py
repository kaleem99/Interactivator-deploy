from flask import Flask, render_template, request, redirect, url_for, send_from_directory, session
from datetime import timedelta
import json
import time
import requests
import os
import datetime

print("started")

app = Flask(__name__)
app.secret_key = os.getenv('flask-key')
app.permanent_session_xlifetime = timedelta(days=14)

wistiaKey = os.getenv('wistia')
clickUpKey = os.getenv('click-up')
frameKey = os.getenv('frame')

@app.route('/health', methods=['GET'])
def health():
    return 'Ok'

# courseCode will determine style and which files are accessed on AWS
# Wistia_URL is the Wistia hashed ID that corresponds to every Wistia video

logsFile = "/persistent/logs.json"
logsFile = "logs.json"

@app.route('/interactivator/<courseCode>/<Wistia_URL>', methods=['POST','GET'])
def interactivator(courseCode,Wistia_URL):
    print(Wistia_URL)
    print(courseCode)
   
    def getSecs(input):
        # for converting srt time to seconds for use in UI
        t = input.strip().split(':')
        seconds = round(float(t[2].replace(',','.')),3)
        return str((float(t[0])*3600) + (float(t[1])*60) + seconds)
    def hhmmss(input):
        # for converting from UI time to srt time
        output = time.strftime('%H:%M:%S', time.gmtime(int(input.split('.')[0])))
        if '.' in input:
            output = str(output) + ',' + str(format(round(float(input),3), '.3f')).split('.')[1]
        else:
            output = str(output)
        return output

    # determine if we render the review page later
    if "-review" in Wistia_URL:
        Wistia_URL = Wistia_URL.split('-review')[0]
        review = True
    else:
        review = False

    session['Wistia_URL'] = Wistia_URL
    print(session)
    print("printing session")

    WistiaHeaders = {"Content-Type": "application/json","Authorization": "Bearer " + wistiaKey}

    if request.method == "POST":
        session['VidTime'] = request.form['VidTime']
        session['playRate'] = request.form['playRate']

        # Figure out what is toggled on and off from form so it can be passed to page refresh
        session['toggleLogs'] = []
        toggleLogs = ['chapterToggleLog','functionToggleLog','subToggleLog']
        for tolleLog in toggleLogs:
            if tolleLog in request.form:
                if request.form[tolleLog] == 'off':
                    session['toggleLogs'].append(tolleLog.replace('ToggleLog',''))

        y = 1
        newCCs = ''
        chapterlist = []
        functionList = []
        newLines = []
        speakers = []
        notes = []
        
        for item in request.form:
            print(request.form[item])
            print("Form")
            if '/' in item:
                start = item.split('/')[0]
                end = item.split('/')[1]
                text = request.form[item]
                # Distinguish between CCs and chapters
                if item.startswith('newLine'):
                    newLines.append(item.replace('newLine',''))
                elif item.endswith('/speaker'):
                    speakers.append(item.replace('/speaker','')+'/'+request.form[item])
                elif item.endswith('/notes'):
                    if (request.form[item] != ''):
                        notes.append([item.replace('/notes',''),request.form[item]])

                elif end != '0':
                    newCCs = newCCs + str(y) + '\n' + hhmmss(start) + ' --> ' + hhmmss(end) + '\n' + text + '\n\n'
                    print(start)
                    print(hhmmss(start))
                    print("++++++++++")
                    y = y + 1
                else:
                    chapterlist.append({'title':text, 'time':start})

        # read logs.json (all data not stored in Wistia)
        with open(logsFile) as json_file:
            logs = json.load(json_file)
            newLogs = {'chapterlist':chapterlist,'functionList':request.form['functionListInput'],'newLines':newLines,'speakers':speakers, 'notes':notes}
            if Wistia_URL in logs.keys():
                # Only update logs if they change
                for log in logs[Wistia_URL]:
                    if logs[Wistia_URL][log] != newLogs[log]:
                        # Report what has changed to help with debugging
                        print(log+' has changed from:')
                        print(logs[Wistia_URL][log])
                        print('to:')
                        print(newLogs[log])
                
            logs[Wistia_URL] = newLogs
            with open(logsFile, 'w') as outfile:
                json.dump(logs, outfile)

        if chapterlist == []:
            chaptersOn = 'false'
        else:
            chaptersOn = 'true'
        data = json.dumps({"plugin":{"chapters":{"on": chaptersOn, "chapterList": chapterlist}}})
        customisations = requests.get('https://api.wistia.com/v1/medias/'+Wistia_URL+'/customizations.json', headers=WistiaHeaders)
        def updateChapters():
            print('updating chapters')
            postChapters = requests.post('https://api.wistia.com/v1/medias/'+Wistia_URL+'/customizations.json',data=data, headers=WistiaHeaders)
            print(postChapters)

        # Only update chapters on Wistia if they have changed 
        if 'plugin' not in customisations.json():
            updateChapters()
        elif 'chapters' not in customisations.json()['plugin'].keys():
            if chapterlist != []:
                updateChapters()
        elif 'chapterList' not in customisations.json()['plugin']['chapters'].keys():
            if chapterlist != []:
                updateChapters()
        elif chapterlist != customisations.json()['plugin']['chapters']['chapterList']:
            updateChapters()

        # Get captions on Wistia so it can be compared to UI input
        response = requests.get(f"https://api.wistia.com/v1/medias/{Wistia_URL}/captions.json", headers=WistiaHeaders)
        if response.json() == []:
            oldCCs = ''
        else:
            oldCCs = response.json()[0]['text']
        newCCs = newCCs.replace('\r','')

        # Only update captions on Wistia if they have changed
        if (newCCs != "") and (newCCs[:-1] != oldCCs):
            print('captions changed: ')
            x = 0
            # print(newCCs)
            # print("newCCs")
            for line in newCCs[:-1].split('\n'):
                if len(oldCCs.split('\n')) > x:
                    oldLine = oldCCs.split('\n')[x]
                    if line != oldLine:
                        print(oldLine + ' ----- > ' + line)
                    x = x + 1
                else:
                    print('new line: ' + line)

            print('---------------------------------')
            print('updating captions')
            print('---------------------------------')
 
            data = json.dumps({"caption_file":newCCs})
            # print(data)
            p = requests.put('https://api.wistia.com/v1/medias/'+Wistia_URL+'/captions/eng.json', data=data, headers=WistiaHeaders)
            if (not p.ok):
                error = 'Failed to update subtitles and/or captions on Wistia'
                return render_template('error.html',error=error)
        return redirect(url_for('interactivator',Wistia_URL=session['Wistia_URL'],courseCode=courseCode))

    else:

        # Get Interactivator data
        interactivatorURL = 'https://videos.getsmarter.com/Interactive+Video+Content/interactivator.js'
        interactivatorData = requests.get(interactivatorURL, headers={'User-Agent': 'Mozilla/5.0'}).text.split('// -- cut here --')[1]

        # Get data from /persistent/logs.json
        with open(logsFile) as json_file:
            logs = json.load(json_file)
            if Wistia_URL in logs.keys():
                logs = logs[Wistia_URL]
                functionList = logs['functionList']
                print(logs['functionList'])
            elif review:
                functionList = ''
            else:
                functionList = 'new'

        # Go to Wistia Asset project (lo2mffrtc6) to search for intro and outro
        r = requests.get('https://api.wistia.com/v1/projects/lo2mffrtc6.json', headers=WistiaHeaders)
        intro = session['Wistia_URL']
        print(intro, "intro")
        outro = ''
        if r.ok:
            data = r.json()
            print(r.json(), "r.json")
            for media in data['medias']:
                print(media)
                if media['name'] == courseCode.split('-')[0] + ' Intro':
                    intro = media['hashed_id']
                if media['name'] == courseCode.split('-')[0] + ' Outro':
                    outro = media['hashed_id']


        # Get all the data we need to pass onto the Interactivator web page
        # /persistent/logs.json contains all data that can't be stored in Wistia, it's basically a makeshift database
        saveFile = logsFile
        if (os.path.isfile(saveFile)):
            with open(saveFile) as json_file:
                logs = json.load(json_file)
                if Wistia_URL in logs.keys():
                    logs = logs[Wistia_URL]
                    newLines = logs['newLines']
                    speakers = {}
                    speakersList = []
                    x = 0
                    # Make list of speakers for UI
                    for speaker in logs['speakers']:
                        if '/' in speaker:
                            if speaker.split('/')[1] not in speakers.values():
                                speakersList.append([x+1,speaker.split('/')[1]])
                                x =+ 1
                            speakers[speaker.split('/')[0]] = speaker.split('/')[1]
                    session['speakersList'] = speakersList
                    notes = {}
                    for note in logs['notes']:
                        notes[note[0]] = note[1]
                        
                else:
                    newLines = []
                    speakers = []
                    session['speakersList'] = []
                    notes = []

            
        else:
            newLines = []
            speakers = []
            session['speakersList'] = []
            notes = []

        # Get chapterlist from Wistia API
        response = requests.get(f"https://api.wistia.com/v1/medias/{Wistia_URL}/customizations.json", headers=WistiaHeaders)
        customisations = json.loads(response.text)
        chapters = []
        if 'plugin' in customisations.keys():
            if 'chapters' in customisations['plugin'].keys():
                if 'chapterList' in customisations['plugin']['chapters'].keys() and (customisations['plugin']['chapters']['on'] == 'true'):
                    for ch in customisations['plugin']['chapters']['chapterList']:
                        chapter = []
                        chapter.append(ch['time'])
                        chapter.append('0')
                        chapter.append(ch['title'])
                        chapter.append('chapter')
                        chapters.append(chapter)
        print(chapters)
        CCs = []
        printout = ''
        videoData = requests.get(f"https://api.wistia.com/v1/medias/{Wistia_URL}.json", headers=WistiaHeaders)
        videoName = json.loads(videoData.text)['name']
        
        # Get captions from Wistia API
        response = requests.get(f"https://api.wistia.com/v1/medias/{Wistia_URL}/captions.json", headers=WistiaHeaders)
        if json.loads(response.text) == []:
            # If there are no captions
            def sortFirstNum(e):
                return float(e[0])
            chapters.sort(key=sortFirstNum)
            print(chapters)
        else:

			
                # Convert srt captions to list of subtitles that can be added to the UI
                segments = json.loads(response.text)[0]['text'].split('-->')
                # print(segments)
                # print("segments")
                x=0
                for segment in segments:
                    CC = []
                    if x > 0:
                        start = getSecs(segments[x-1].split('\n')[-1])
                        end = getSecs(segment.split('\n')[0])
                        CC.append(start)
                        CC.append(end)
                        textPart = segment.split('\n\n')[0]
                        textPart = textPart.split('\n')
                        del textPart[0]
                        CC.append('\n'.join(textPart).strip())
                        CC.append('CCs')
                        if start + '/' + end in newLines:
                            CC.append('checked')
                            CC.append(' on')
                        else:
                            CC.append('')
                            CC.append('')
                        if start in speakers:
                            CC.append(speakers[start])
                        else:
                            CC.append('')
                        if start in notes:
                            CC.append(notes[start])
                        else:
                            CC.append('')
                        CCs.append(CC)
                    x = x + 1
                CCs = CCs + chapters
                # print(CCs)
                # print("CCs")
                def sortFirstNum(e):
                    return float(e[0])
                CCs.sort(key=sortFirstNum)
                print(chapters)
                # If paragraph breaks are not set, do it automatically
                if len(newLines) == 0:
                    autoParagraph = True
                else:
                    autoParagraph = False
                for CC in CCs:
                    speaker = ''
                    if len(CC) > 6:
                        if CC[6] != '':
                            speaker = '<p>' + CC[6] + ': '
                    text = speaker + CC[2]
                    if (len(text.split('\n')) < 2) and autoParagraph:
                        space = '<p>'
                        x = 0
                    elif CC[0] + '/' + CC[1] in newLines:
                        space = '<p>'
                    else:
                        space = ' '
                    notes = ''

                    # Long lists in CCs are notes, add them to transcript printout along with chapters
                    if len(CC) > 7:
                        if CC[7] != '':
                            notes = '<span style="color:red;"> '+CC[7]+' </span>'
                    if CC[3] == 'CCs':
                        printout = printout + text + notes + space
                    elif CC[3] == 'chapter':
                        printout = printout + '<h2>' + text + '</h2>'
                    x = x + 1
                


        print('Interactivator accessed for '+Wistia_URL + '--'+videoName)

        chapters = []
        if 'chapterlist' in logs.keys():
            for chapter in logs['chapterlist']:
                chapters.append([chapter['time'],chapter['title']])

        session['videoName'] = videoName
        print("9999999999")
        print(intro)
        print(outro)
        indexes = functionList.split(";")
        print(indexes)
        filtered_data = [item for item in indexes if 'Video_Interactivity_Timestamp' in item]
        print(filtered_data)
        print("[][][][][][][][][][][]")
        # Remember where we are in the video and the play speed so it's not reset with every save
        
        if 'VidTime' not in session:
            session['VidTime'] = 0
        if 'playRate' not in session:
            session['playRate'] = 1
        elif session['playRate'] == '':
            session['playRate'] = 1
        # Remember what is toggled on and off
        if 'toggleLogs' not in session:
            session['toggleLogs'] = ['chapter','sub','function']
        print(session['toggleLogs'])
        print("Testing 1")
        for toggleLog in session['toggleLogs']:
            print(toggleLog) 
        if review:
            return render_template('InteractivatorReview.html', 
            # below is the data that is passed to the html templates
            chapters=chapters, 
            intro=intro,
            outro=outro,
            Wistia_URL=Wistia_URL,
            name=videoName,
            courseCode=courseCode,
            functionList=functionList)
        else:
            return render_template('interactivator.html', 
            chapters=chapters,
            courseCode=courseCode,
            up=courseCode.split('-')[0],
            functionList=functionList,
            playRate=session['playRate'],
            speakersList=session['speakersList'],
            Wistia_URL=session['Wistia_URL'],
            CCs=CCs, 
            printout=printout,
            videoName=videoName, 
            toggleLogs=session['toggleLogs'], 
            VidTime=session['VidTime'],
            interactivatorData=interactivatorData,
            intro=intro,
            outro=outro, index=filtered_data)
@app.route('/interactivator/<courseCode>/<Wistia_URL>/review')
def Interactivator_Review(courseCode,Wistia_URL):
    WistiaHeaders = {"Content-Type": "application/json","Authorization": "Bearer " + wistiaKey}

    response = requests.get(f"https://api.wistia.com/v1/medias/{Wistia_URL}.json", headers=WistiaHeaders)
    print(response.json()['name'])

    return render_template('InteractivatorReview.html', Wistia_URL=Wistia_URL,name=response.json()['name'])

def FrameToWistia(shareLink):
    import requests
    import json

    WistiaHeaders = {"Content-Type": "application/json","Authorization": "Bearer " + wistiaKey}

    # Get redirect link if there is one
    try:
        response = requests.get(shareLink)
        if response.history:
            shareLink = response.url
    except:
        print('This is not a proper URL.')

    # Try get review link
    url = "https://api.frame.io/v2/review_links/" + shareLink.split('/')[-1] + "/items"
    query = {"include": "string"}
    headers = {"Content-Type": "application/json","Authorization": "Bearer " + frameKey}
    response = requests.get(url, headers=headers, params=query)


    # If it's not a review link assume it's an asset link
    if not response.ok:
        query = {"include": "string"}
        url = "https://api.frame.io/v2/assets/" + shareLink.split('/')[-1].split('?version=')[0]
        response = requests.get(url, headers=headers, params=query)
        data = response.json()
        reviewLink = False
    else:
        reviewLink = True
        data = response.json()[0]['asset']

    if not response.ok:
        return 'This is not a proper Frame link'


    if data['type'] == 'version_stack':
        if not reviewLink:
            url = "https://api.frame.io/v2/assets/" + data['cover_asset_id']
            response = requests.get(url, headers=headers, params=query)
            video = response.json()
        else:
            video = data['cover_asset']
    else:
        video = data

    # Get wistia project from ClickUp
    frameProjectURL = 'https://app.frame.io/projects/' + video['project_id']
    headers = {'Authorization': clickUpKey,'Content-Type': 'application/json'}
    request = requests.get('https://api.clickup.com/api/v2/list/175406920/task', headers=headers)
    courses = request.json()['tasks']
    wistiaProject = False
    frameValue = ''
    WistiaValue = ''
    for course in courses:
        for customField in course['custom_fields']:
            if customField['name'] == 'Frame':
                if 'value' in customField.keys():
                    frameValue = customField['value']
            if customField['name'] == 'WISTIA':
                if 'value' in customField.keys():
                    WistiaValue = customField['value']
        if (course['status']['status'] != 'live') and (frameValue == frameProjectURL):
            wistiaProject = WistiaValue.split('/')[-1]
            break

    #Check if Wistia project has a video with same name
    print(wistiaProject)
    if wistiaProject:
        WistiaResponse = requests.get(f'https://api.wistia.com/v1/projects/{wistiaProject}.json?access_token='+wistiaKey)
        print(wistiaProject)
        print("______________")
        videosInWistiaProject = WistiaResponse.json()['medias']
        for wistiaVideo in videosInWistiaProject:
            if wistiaVideo['name'] == video['name'].split('.')[0]:
                return f'Wistia project already contains one or more videos with the name "{video["name"].split(".")[0]}". Please delete or replace the video on Wistia.'
        
    # Upload to Wistia
    if wistiaProject:
        WistiaResponse = requests.post('https://upload.wistia.com?access_token='+wistiaKey, {'url':video['h264_1080_best'],'name':video['name'].split('.')[0], 'project_id':wistiaProject})
        return 'https://getsmarter-4.wistia.com/medias/' + WistiaResponse.json()['hashed_id']
    else:
        return 'Videos in this course are not available for transfer.'

@app.route('/fgOPqQQZja/Frame2Wistia', methods=['POST','GET'])
def Frame2Wistia():
    if request.method == "POST":
        return render_template('Frame2Wistia.html',message=FrameToWistia(request.form['FrameLink']))
    else:
        return render_template('Frame2Wistia.html',message='')

@app.route('/Frame2WistiaDirect', methods=['POST'])
def Frame2WistiaDirect():
    return {"title": "Sent to Wistia", "description": FrameToWistia(json.loads(request.data)['resource']['id'])}

def getComments(videoLinks):
    # Below is just an example.
    videoLinks = {'h264_2160': None, 'h264_720': 'https://assets.frame.io/encode/aca35f3f-4d33-41cb-9616-b86810625605/h264_720.mp4?x-amz-meta-resource_id=aca35f3f-4d33-41cb-9616-b86810625605&x-amz-meta-resource_type=asset&x-amz-meta-request_id=FuB50VEj-yctgR8zzILD&x-amz-meta-project_id=714a5108-5252-40d1-853d-2ae95164f479&Expires=1648537803&Signature=FOvCKv9fhCTRoUaL3cNATR8dwHwrrZ-UfC7Yl0j8HQV90ZVc3eI66MP8V4TjUvq6meCFbKmg6ggJ5TLfi58oCznJYVB8lBmMWN4lACSBwUq3AvXnOAFKOKXc6iXG3K2c778OFxGxdM9Ysm1sc4fyOATJivrZ1yozNGENT5dbYcsiIGPXP~C7aznkZl8fXCUmXVxsHYlGw4J42vEZEE~m4BpmdazQUMVvJL5mjgphLdPpd43YZGfMQr3ThiNWvgQuRS-D40MPLvBAlNIDibEBCv-PX-kG5~G3C9YM3ixw5xLG30lsMuPH9teRbdUXyJoEiNP49viPb9101tGo5bVJxQ__&Key-Pair-Id=K1XW5DOJMY1ET9', 'h264_1080_best': 'https://assets.frame.io/encode/aca35f3f-4d33-41cb-9616-b86810625605/h264_1080_best.mp4?x-amz-meta-resource_id=aca35f3f-4d33-41cb-9616-b86810625605&x-amz-meta-resource_type=asset&x-amz-meta-request_id=FuB50VEj-yctgR8zzILD&x-amz-meta-project_id=714a5108-5252-40d1-853d-2ae95164f479&Expires=1648537803&Signature=kckSU-yF5NdCAl6-WjjhrTVsv9SfzMtsvj7rcAe4GzLG52ZLhV7LYlYVqKF2LcaOexiKUu2kXi5a2pfzuaEhUb4YrBUuuHLifALyjaRUwcnKfcrZ-U5YqpWtoMJR56kjV3zW1LXlQgzGkTMPXG7E55lALo5QNOcGqdaK2v~Cbi8zBts01I7GaTCKswz9megBB-7Y2hx-dWrHu4D1n0dzIIF8JG7Kz4fqeeLyiCYv2cR35oqcWyviayHNYJANfb1lanE5ymtbHetp-CoxEOcyDQHXtmkMGptSTI3eh~7kxlK3EOeZNNd0hOLYJH4IM4VKhCNt0kzJBhG4UK1pGoyUyA__&Key-Pair-Id=K1XW5DOJMY1ET9', 'h264_360': 'https://assets.frame.io/encode/aca35f3f-4d33-41cb-9616-b86810625605/h264_360.mp4?x-amz-meta-resource_id=aca35f3f-4d33-41cb-9616-b86810625605&x-amz-meta-resource_type=asset&x-amz-meta-request_id=FuB50VEj-yctgR8zzILD&x-amz-meta-project_id=714a5108-5252-40d1-853d-2ae95164f479&Expires=1648537803&Signature=oQgXXPeeR1hdbcEhZF4GPVTiAuuPp~L~SdMzgu-6H4hxMgx0zxRagwU8D6XtuVGzyHdP3rEf9M6bGpHDwOGst3lGbcc5vTHc~34HVF4Gg1wacLwU-ADkjR7cUPqFwDskK3UcGZyx5CFzU-iKX1HEIj24aWW7ozLEKfkGIcXKzV94LT37Z3B2ukgq~ekSc-RYomIinZZQqS~hOOOy77QKOOTQE3pXgDEv-xIx9o8AbkgurqDjxOkAJIXzptmSd8TZ-nO~wd4G3~n9MlAJp39xwgh2j6mJj72ZmJM9R9lWWaQji1j1YB8tfLM2lMzgYLSc9PmTU-aL-xSsJikIl3lHHA__&Key-Pair-Id=K1XW5DOJMY1ET9', 'h264_540': 'https://assets.frame.io/encode/aca35f3f-4d33-41cb-9616-b86810625605/h264_540.mp4?x-amz-meta-resource_id=aca35f3f-4d33-41cb-9616-b86810625605&x-amz-meta-resource_type=asset&x-amz-meta-request_id=FuB50VEj-yctgR8zzILD&x-amz-meta-project_id=714a5108-5252-40d1-853d-2ae95164f479&Expires=1648537803&Signature=PWcPrLPAxT9~I~hnctZWkfzXsdvZj0DPwjNv~7TlRYPwnXxYYh5a7jFSAMINs9FJMwoezVCcCBnjZt9wNVtrweFn5PKI4O3uPdgBmCwJLGmvk0fB4rztGMH3oFDo6LyGtsqX9eruFwKdctJ~QdkigeyuJZknzJPtE3-KruYLlr1tkkzUhn5c2jaZicAyV6XfeCWXXYN1U0Ds7pNTZoSMkgvQFw~YrklyWEErDeDHzSjDBWOwR4em5LO17f1y39h9eb6PO-I~6LqyxHYZPeBQJbvB~vNeDUAwvvx9g~~vOEitoNApL5lBXOPp1ipMJVe2lSno6lNwFRxrnn0ADnN2FA__&Key-Pair-Id=K1XW5DOJMY1ET9'}
    
    # This is where the machine learning happens

    # Machine learning process produces csv files and we generate comments
    logoCSV = "summary_lp2_v1.csv"
    colourCSV = "summary_l2_v1.csv"
    

    comments = []
    import csv
    
    # Get logo comments
    lastCheckFrame = -26
    with open(logoCSV) as csvfile:
        readCSV = csv.reader(csvfile, delimiter=',')
        for row in readCSV:
            for cell in row:
                if cell == "Check":
                    frame = int(row[7])
                    if frame > lastCheckFrame + 25:
                        comments.append({"frames":frame,"comment":"Check logo"})
                        lastCheckFrame = frame

    # Get colour comments
    lastCheckFrame = -26
    with open(colourCSV) as csvfile:
        readCSV = csv.reader(csvfile, delimiter=',')
        for row in readCSV:
            if row[21] == "Check":
                # I'm guessing this is actually frames and not milliseconds but no idea really

                x = time.strptime(row[4],'%H:%M:%S')
                frame = int(datetime.timedelta(hours=x.tm_hour,minutes=x.tm_min,seconds=x.tm_sec).total_seconds())*25
                
                if frame > lastCheckFrame + 25:
                    comments.append({"frames":frame,"comment":"Check video"})
                    lastCheckFrame = frame

    # comments = [{"frames":0,"comment":"I am just a simple Python script and am not yet smart enough to have an opinion of this video."}]
    return comments

@app.route('/reviewbot', methods=['POST'])
def reviewBot():
    asset_id = json.loads(request.data)['resource']['id']
    query = {"include": "string"}
    headers = {'Authorization': 'Bearer fio-u-FLEtFqEXeC7TZ6wYTrrFcGundXOX7h02iHJaASKXkHnwzyYz_FqCPgYbZ42tGxHL','Content-Type': 'application/json'}
    url = "https://api.frame.io/v2/assets/" + asset_id
    videoData = requests.get(url, headers=headers, params=query)

    # Get all available video links in different resolutions
    videoLinks = {}
    for key in videoData.json().keys():
        if key.startswith('h264_'):
            videoLinks[key] = videoData.json()[key]

    # Run the function with the machine learning and post to Frame for each comment
    for comment in getComments(videoLinks):
        payload = {"text": comment['comment'],"timestamp": comment['frames'],}
        requests.post(url + "/comments", json=payload, headers=headers)
    return {"title": "Sent to Auto-VP!", "description": "Comments will be added soon."}

if __name__ == "__main__":
    # Check if file exists first, /persistent/logs.json
    from os.path import exists
    file_exists = exists(logsFile)
    if not file_exists:
        import shutil
        shutil.copyfile('logs.json', logsFile)

    # Run in debug mode if we are local
    environment = os.getenv('ENVIRONMENT')
    if (environment and environment == "local"):
        app.run(host='0.0.0.0', port=8080, debug=True)
    else:
        from waitress import serve
        serve(app, host="0.0.0.0", port=8080)
