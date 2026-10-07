package com.eri.gsmusiclyre.parser;

import android.content.Context;
import com.eri.gsmusiclyre.model.NoteEvent;
import com.eri.gsmusiclyre.model.Song;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class SongParser {
    public static List<Song> loadBuiltinSongs(Context context) {
        List<Song> songs = new ArrayList<>();
        try {
            InputStream is = context.getAssets().open("songs/builtin_songs.json");
            int size = is.available();
            byte[] buffer = new byte[size];
            int read = is.read(buffer);
            is.close();
            if (read > 0) {
                String json = new String(buffer, StandardCharsets.UTF_8);
                JSONArray array = new JSONArray(json);
                for (int i = 0; i < array.length(); i++) {
                    JSONObject obj = array.getJSONObject(i);
                    String id = obj.optString("id", "song_" + i);
                    String title = obj.optString("title", "Untitled");
                    String category = obj.optString("category", "General");
                    int bpm = obj.optInt("bpm", 120);
                    double duration = obj.optDouble("duration", 60.0);

                    List<NoteEvent> events = new ArrayList<>();
                    JSONArray eventsArr = obj.optJSONArray("events");
                    if (eventsArr != null) {
                        for (int j = 0; j < eventsArr.length(); j++) {
                            JSONObject evObj = eventsArr.getJSONObject(j);
                            double time = evObj.optDouble("time", 0.0);
                            List<String> notes = new ArrayList<>();
                            JSONArray notesArr = evObj.optJSONArray("notes");
                            if (notesArr != null) {
                                for (int k = 0; k < notesArr.length(); k++) {
                                    notes.add(notesArr.getString(k));
                                }
                            }
                            events.add(new NoteEvent(time, notes));
                        }
                    }
                    songs.add(new Song(id, title, category, bpm, duration, events));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return songs;
    }
}
