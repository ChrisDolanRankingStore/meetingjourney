// Original listening cues, checked against linked material. No article text.
export const listeningPointChoices = {
 'Notice who is involved and why peace matters.': ['People working for peace', 'A relationship worth protecting', 'An act of love'],
 'Listen for a respectful way of approaching another person.': ['Speaking with respect', 'Giving someone a choice', 'Considering another person'],
 'Notice what can help someone put a mistake right.': ['Putting a mistake right', 'Offering practical help', 'Accepting responsibility'],
 'Listen for an idea that can make forgiveness easier.': ['Choosing to forgive', 'Showing patience', 'Remembering love'],
 'What could help you be patient and kind this week?': ['Being patient this week', 'Showing kindness', 'Helping someone personally'],
 'Notice the gift being discussed and why it matters.': ['Valuing a privilege', 'Serving with gratitude', 'Recognising a gift'],
 'Listen for encouragement for someone who feels unworthy.': ['Encouraging someone', 'Finding courage', 'Accepting help'],
 'Notice a reason to share something helpful with others.': ['Sharing something helpful', 'Caring about others', 'Acting with courage']
};
export function enrichListeningPoints(meeting) {
 return {...meeting,parts:meeting.parts.map(part=>part.studyGuide?{...part,studyGuide:{...part.studyGuide,cues:part.studyGuide.cues.map(cue=>({...cue,pointChoices:cue.pointChoices??listeningPointChoices[cue.prompt]}))}}:part)};
}
export const studyGuides={
 '2026-10-19':{paragraphCount:18,cues:[{from:1,to:3,prompt:'Notice who is involved and why peace matters.'},{from:4,to:7,prompt:'Listen for a respectful way of approaching another person.'},{from:8,to:11,prompt:'Notice what can help someone put a mistake right.'},{from:12,to:15,prompt:'Listen for an idea that can make forgiveness easier.'},{from:16,to:18,prompt:'What could help you be patient and kind this week?'}]},
 '2026-10-26':{paragraphCount:16,cues:[{from:1,to:6,prompt:'Notice the gift being discussed and why it matters.'},{from:7,to:11,prompt:'Listen for encouragement for someone who feels unworthy.'},{from:12,to:16,prompt:'Notice a reason to share something helpful with others.'}]}
};
export function enrichMeeting(meeting){
 return enrichListeningPoints({...meeting,parts:meeting.parts.map(part=>{
  const study=part.type==='WatchtowerStudy'?studyGuides[meeting.weekOf]:undefined;
  const activities=part.activities.length?part.activities:[{id:`notice-${part.id}`,type:'ClueCards',title:'A thought to keep',prompt:part.summary,mission:{title:'A thought to keep',listeningObjective:part.summary,clues:[part.type==='Song'?'Notice a word you hear in the song.':part.type==='Demonstration'?'Notice how one person listens to the other.':'Notice one word, scripture or example.',part.type==='Song'?'Does the song remind you of something from the meeting?':part.type==='Demonstration'?'What feels kind or helpful about the conversation?':'How does that thought connect to the main idea?', 'Keep it as a word, a drawing or a question. Listening is enough too.']}}];
  return {...part,activities,...(study?{studyGuide:study}:{})};
 })});
}
