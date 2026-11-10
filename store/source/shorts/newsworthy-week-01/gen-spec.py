# gen-spec.py: builds newsworthy-week-01-spec.json from take t4's times (seconds into work/takes/t4/take.mov).
# Run from the episode folder. Marks are in work/takes/t4/state.jsonl: chevron 3.03, timeline-top 5.02,
# timeline-end 25.66, still-the-end 29.03, reading-again 31.77.
import json
take="work/takes/t4/take.mov"
INK="#16161A"; WHITE="#FFFFFF"
clips=[ # name, from, to, speed, extra
 ("hook",0.2,1.7,0.75,{"shift":-140}),
 ("number",1.7,3.0,0.65,{"shift":-140,"zoom":1.06,"focus":[0.5,0.6],"move":0.35}),
 ("down",3.0,5.0,1,{"move":0.4}),
 ("scroll",5.0,25.4,6,{}),
 ("end",25.4,28.4,1,{"shift":-576,"zoom":0.84,"focus":[0.5,1.0],"move":0.6}),
 ("back",29.0,31.7,1,{"shift":-140,"move":0.6}),
]
spec={"output":"work/silent.mp4","size":[1080,1920],"fps":30,"bitrate":12000000,"background":"#EDE7E0","crossfade":0.12,"move":0.5,
 "caption":{"size":56,"lineHeight":84,"baseline":380,"centerX":480,"color":WHITE,"accent":"#F2B77C","tracking":-0.5},
 "screen":{"x":100,"y":440,"width":760,"height":1645,"radius":64,"bezel":14,"bezelColor":"#16161A","shadow":0.22},
 "clips":[],"captions":[]}
t=0;start={}
for name,a,b,speed,extra in clips:
    c={"file":take,"from":a,"to":b}
    if speed!=1:c["speed"]=speed
    c.update(extra);spec["clips"].append(c);start[name]=t;t+=(b-a)/speed
T=t
def cap(a,b,lines,**k):
    spec["captions"].append({"from":round(a,3),"to":round(b,3),"lines":lines,"box":INK,**k})
cap(-1,start["number"]-0.05,["A news app","that [ends]?"],size=88,lineHeight=118,baseline=590)
cap(start["number"]+0.1,start["down"]-0.05,["Nov 10, 2026: rated [6/10]"],pop=True,size=60,baseline=650)
cap(start["down"]+0.35,start["scroll"]-0.05,["Below: [one week] of stories"])
cap(start["scroll"]+0.1,start["end"]-0.1,["Keep scrolling…"])
cap(start["end"]+0.55,start["back"]-0.05,["That’s it. It [ends]."],pop=True,size=80,baseline=388)
cap(start["back"]+0.9,T+2,["Would you read news this way?"],size=44,lineHeight=70,baseline=560)
cap(start["back"]+1.2,T+2,["Search ‘Newsworthy: Calm News’","on the [App Store]"],size=44,lineHeight=74,baseline=672)
json.dump(spec,open("newsworthy-week-01-spec.json","w"),indent=1,ensure_ascii=False)
print({k:round(v,2) for k,v in start.items()},round(T,2))
