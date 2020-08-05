import React, {useEffect, useState} from 'react';
import {API, Auth, graphqlOperation} from 'aws-amplify';
import {withAuthenticator} from 'aws-amplify-react';
import {createNote, deleteNote, updateNote} from "./graphql/mutations";
import {listNotes} from "./graphql/queries";
import {onCreateNote, onDeleteNote, onUpdateNote} from "./graphql/subscriptions";

function App() {
    const [notes, setNotes] = useState([]);
    const [note, setNote] = useState("");
    const [id, setId] = useState("");

    const hasExistingNote = () => {
        if (id) {
            return notes.findIndex(note => note.id === id) > -1
        }
        return false;
    }

    const handleChangeNote = event => setNote(event.target.value);

    const handleAddNote = async event => {
        event.preventDefault();
        if (hasExistingNote()) {
            handleUpdateNote();
        } else {
            await API.graphql(graphqlOperation(createNote, {input: {note}}));
        }
    }

    const handleUpdateNote = async () => {
        await API.graphql(graphqlOperation(updateNote, {input: {id: id, note: note}}))
    }

    const handleDeleteNote = async noteId => {
        await API.graphql(graphqlOperation(deleteNote, {input: {id: noteId}}))
    }

    const handleSetNote = ({note, id}) => {
        setNote(note);
        setId(id);
    }

    const fetchNotes = async () => {
        const result = await API.graphql(graphqlOperation(listNotes));
        const notes = result.data.listNotes.items;
        setNotes(notes);
    }

    const getUser = async () => await Auth.currentUserInfo();

    useEffect(() => {
        fetchNotes();
        getUser().then(user => {
            return API.graphql(graphqlOperation(onCreateNote, {owner: user.username })
            ).subscribe({
                next: value => {
                    setNotes(prevNotes => [value.value.data.onCreateNote, ...prevNotes]);
                    setNote("");
                }
            })
        })
        getUser().then(user => {
            return API.graphql(graphqlOperation(onUpdateNote, {owner: user.username})
            ).subscribe({
                next: value => {
                    const updatedNote = value.value.data.onUpdateNote;
                    setNotes(prevNotes => {
                        const index = prevNotes.findIndex(note => note.id === updatedNote.id)
                        return [...prevNotes.slice(0, index), updatedNote, ...prevNotes.slice(index + 1)]
                    })
                    setNote("")
                    setId("");
                }
            })
        })
        getUser().then(user => {
            return API.graphql(graphqlOperation(onDeleteNote, {owner: user.username})
            ).subscribe({
                next: value => {
                    setNotes(prevNotes => {
                        return prevNotes.filter(note => note.id !== value.value.data.onDeleteNote.id)
                    })
                }
            })
        })
    }, [])

    return (
        <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
            <h1 className="code f2-l">Amplify Notetaker</h1>
            <form className="mb3" onSubmit={handleAddNote}>
                <input type="text" className="pa2 f4" placeholder="Write your note" onChange={handleChangeNote} value={note}/>
                <button className="pa2 f4" type="submit">{id ? "Update Note" : "Add Note"}</button>
            </form>
            <div>
                {notes.map(item => (
                    <div key={item.id} className="flex items-center justify-center">
                        <li className="list pa1 f3" onClick={() => handleSetNote(item)}>
                            {item.note}
                        </li>
                        <button className="bg-transparent bn f4" onClick={() => handleDeleteNote(item.id)}>
                            <span>&times;</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default withAuthenticator(App, {includeGreetings: true});
