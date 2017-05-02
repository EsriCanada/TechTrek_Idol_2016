package ca.esri.android.telenav;

import android.content.Intent;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

public class Text extends AppCompatActivity {

    private Button submit;
    private Button cancel;
    private TextView textField;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_text);
        submit = (Button)findViewById(R.id.submit);
        cancel = (Button)findViewById(R.id.cancel);
        textField = (TextView)findViewById(R.id.editText);

        textField.setFocusable(true);
        textField.setEnabled(true);
        textField.setClickable(true);
        textField.setFocusableInTouchMode(true);

        submit.setOnClickListener(new View.OnClickListener()
        {
          @Override
          public void onClick (View v){
              Intent intent = new Intent();
              //add the resulting textfield back
              intent.putExtra("description", textField.getText().toString());
              textField.setText("");
              setResult(RESULT_OK, intent);
              finish();
          }
        });

        cancel.setOnClickListener(new View.OnClickListener(){
            @Override
            public void onClick(View v){
                textField.setText("");
                finish();
            }
        });
    }



}
