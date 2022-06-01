import React, { useState, useEffect } from 'react'; 
//import { render } from "react-dom"; 
import AceEditor from "react-ace"; 
import {useLocation} from 'react-router-dom'; 
import "ace-builds/src-noconflict/mode-java"; 
import "ace-builds/src-noconflict/theme-github"; 
import "ace-builds/src-noconflict/ext-language_tools"; 

function onChange(newValue) { 
    console.log("new value:", newValue); 
    const requestOptions = { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json',
                       'Access-Control-Allow-Origin': '*',
                       'Access-Control-Allow-Headers': 'Content-Type'},
            body: JSON.stringify({"newData": newValue}) 
            }; 
    // Update it with document Id, instead of 1.
    fetch('/1', requestOptions) 
        .then(response => response.json()) 
        .then(response => response) 
        .then(data => data); 
}

export default function CodeEditor () { 
    const location = useLocation(); 
    const id = location.pathname.split('/').at(-1); 
    console.log("document id:", id); 
    const [defaultValue, setDefaultValue] = useState([{}]) 

    useEffect(() => {
        // GET request using fetch inside useEffect React hook 
        const requestOptions = { 
            method: 'GET', 
            headers: { 'Content-Type': 'application/json',
                       'Access-Control-Allow-Origin': '*',
                       'Access-Control-Allow-Headers': 'Content-Type'}
            };
        fetch('/' + id, requestOptions) 
            .then(response => response.json()) 
            .then(response => {setDefaultValue(response); console.log("Response2:", response);}) 
            .then(data => data); 
        console.log("default value:", defaultValue['code']) 
        // empty dependency array means this effect will only run once 
        }, []);

        return( 
            <AceEditor 
                mode="java" 
                theme="github" 
                onChange={onChange} 
                value= {defaultValue['code']} 
                editorProps={{ $blockScrolling: true }}
                fontSize={14}
                showPrintMargin={true}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                    enableBasicAutocompletion: false,
                    enableLiveAutocompletion: false,
                    enableSnippets: false,
                    showLineNumbers: true,
                    tabSize: 2,
                }}
            /> 
        )
    
}