// components/reto/controls.tsx
import React, {useState} from 'react';
import {View, Text, Pressable, ScrollView, TextInput} from 'react-native';

export function BRMSeg({ value, onChange, disabled, colors, error }:{
    value?: 'B'|'R'|'M'|null, onChange:(v:'B'|'R'|'M')=>void, disabled?:boolean, colors:any, error?:boolean
}) {
    const opts: ('B'|'R'|'M')[] = ['B','R','M'];
    return (
        <View style={{flexDirection:'row', gap:6, justifyContent:'center', alignItems:'center',
            borderWidth: error?1:0, borderColor: error?'#dc3545':'transparent', borderRadius:10, padding: error?4:0}}>
            {opts.map(k=>{
                const active = value===k;
                return (
                    <Pressable key={k} disabled={disabled} onPress={()=>onChange(k)}
                               style={{paddingVertical:6, paddingHorizontal:12, borderRadius:10,
                                   backgroundColor: active? colors.primary: colors.card,
                                   borderWidth:1, borderColor: active? colors.primary: colors.divider}}>
                        <Text style={{color: active? '#fff': colors.text, fontWeight:'700'}}>{k}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

export function BRMNASeg({ value, onChange, disabled, colors, error }:{
    value?: 'B'|'R'|'M'|'NA'|null, onChange:(v:'B'|'R'|'M'|'NA')=>void, disabled?:boolean, colors:any, error?:boolean
}) {
    const opts: ('B'|'R'|'M'|'NA')[] = ['B','R','M','NA'];
    return (
        <View style={{flexDirection:'row', gap:6, flexWrap:'wrap', justifyContent:'center', alignItems:'center', alignSelf:'center', minWidth:140,
            borderWidth: error?1:0, borderColor: error?'#dc3545':'transparent', borderRadius:10, padding: error?4:0}}>
            {opts.map(k=>{
                const active = value===k;
                return (
                    <Pressable key={k} disabled={disabled} onPress={()=>onChange(k)}
                               style={{paddingVertical:6, paddingHorizontal:12, borderRadius:10,
                                   backgroundColor: active? colors.primary: colors.card,
                                   borderWidth:1, borderColor: active? colors.primary: colors.divider}}>
                        <Text style={{color: active? '#fff': colors.text, fontWeight:'700'}}>{k}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

export function SiNoToggle({ value, onChange, disabled, colors, error }:{
    value?: 'SI'|'NO'|null, onChange:(v:'SI'|'NO')=>void, disabled?:boolean, colors:any, error?:boolean
}) {
    return (
        <View style={{flexDirection:'row', gap:6, justifyContent:'center', alignItems:'center', alignSelf:'center',
            borderWidth: error?1:0, borderColor: error?'#dc3545':'transparent', borderRadius:10, padding: error?4:0}}>
            {(['SI','NO'] as const).map(k=>{
                const active = value===k;
                return (
                    <Pressable key={k} disabled={disabled} onPress={()=>onChange(k)}
                               style={{paddingVertical:6, paddingHorizontal:12, borderRadius:10,
                                   backgroundColor: active? colors.primary: colors.card,
                                   borderWidth:1, borderColor: active? colors.primary: colors.divider}}>
                        <Text style={{color: active? '#fff': colors.text, fontWeight:'700'}}>{k}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

export function ComboBox({ value, onChange, options, placeholder, disabled, colors, error }:{
    value?: string | null, onChange:(v:string)=>void, options:string[], placeholder?:string, disabled?:boolean, colors:any, error?:boolean
}) {
    const [open, setOpen] = useState(false);
    const label = value || placeholder || 'Seleccione…';
    return (
        <View style={{width:'100%'}}>
            <Pressable disabled={disabled} onPress={()=>setOpen(o=>!o)}
                       style={{paddingVertical:10, paddingHorizontal:12, borderRadius:10,
                           borderWidth:1, borderColor: error? '#dc3545': colors.divider,
                           backgroundColor: disabled? colors.mutedBg: 'transparent'}}>
                <Text style={{color: value? colors.text: colors.mutedText, fontWeight:'600'}}>{label}</Text>
            </Pressable>
            {open && !disabled && (
                <View style={{marginTop:6, borderWidth:1, borderColor: colors.divider, borderRadius:10,
                    backgroundColor: colors.card, maxHeight:220}}>
                    <ScrollView>
                        {options.map(opt=>(
                            <Pressable key={opt} onPress={()=>{onChange(opt); setOpen(false);}}
                                       style={{paddingVertical:10, paddingHorizontal:12, borderBottomWidth:1, borderBottomColor: colors.divider}}>
                                <Text style={{color: colors.text}}>{opt}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

export function ACToggle({ value, onChange, disabled, colors, error }:{
    value?: 'A'|'C'|null, onChange:(v:'A'|'C')=>void, disabled?:boolean, colors:any, error?:boolean
}) {
    return (
        <View style={{flexDirection:'column', gap:6, borderWidth: error?1:0, borderColor: error?'#dc3545':'transparent', borderRadius:10, padding: error?4:0}}>
            {(['A','C'] as const).map(k=>{
                const active = value===k;
                return (
                    <Pressable key={k} disabled={disabled} onPress={()=>onChange(k)}
                               style={{paddingVertical:6, paddingHorizontal:12, borderRadius:10,
                                   backgroundColor: active? colors.primary: colors.card,
                                   borderWidth:1, borderColor: active? colors.primary: colors.divider, alignItems:'center'}}>
                        <Text style={{color: active? '#fff': colors.text, fontWeight:'700'}}>{k}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
