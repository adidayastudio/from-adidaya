import React from 'react';
import {Text,View} from 'react-native';
export function DeliverableProgressBar({percent,isDark,width=90}:{percent:number;isDark:boolean;width?:number}){
    const value=Math.max(0,Math.min(100,percent||0));
    return <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(value)}} style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{width,height:5,borderRadius:999,backgroundColor:isDark?'#38383A':'#E5E5EA',overflow:'hidden'}}><View style={{width:`${value}%`,height:5,borderRadius:999,backgroundColor:value>=100?'#159957':'#007AFF'}}/></View><Text style={{color:isDark?'#AEAEB2':'#636366',fontSize:11,width:38,textAlign:'right'}}>{Math.round(value)}%</Text></View>;
}
