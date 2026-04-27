#include "../include/game.h"
#include "../include/memory.h"
#include "../include/string.h"
#include "../include/math.h"
#include "../include/screen.h"
#include <stdio.h>
#include <sys/ioctl.h>
#include <unistd.h>

/* Double-line snake characters (UTF-8) */
#define CH_H  "\xe2\x95\x90"  /* ═ */
#define CH_V  "\xe2\x95\x91"  /* ║ */
#define CH_TL "\xe2\x95\x94"  /* ╔ */
#define CH_TR "\xe2\x95\x97"  /* ╗ */
#define CH_BL "\xe2\x95\x9a"  /* ╚ */
#define CH_BR "\xe2\x95\x9d"  /* ╝ */
#define CH_AR "\xe2\x96\xb6"  /* ▶ */
#define CH_AL "\xe2\x97\x80"  /* ◀ */
#define CH_AU "\xe2\x96\xb2"  /* ▲ */
#define CH_AD "\xe2\x96\xbc"  /* ▼ */
#define CH_FOOD  "\xe2\x97\x8f"  /* ● */
#define CH_BONUS "\xe2\x98\x85"  /* ★ */
#define CH_DOT   "\xe2\x80\xa2"  /* • */

#define CLR_BORDER  220
#define CLR_HEAD     46
#define CLR_BODY     34
#define CLR_FOOD    196
#define CLR_BONUS   226
#define CLR_TITLE    39
#define CLR_SCORE_L 252
#define CLR_SCORE_V 214
#define CLR_SPEED_L 245
#define CLR_HIGH    226
#define CLR_DEATH   196

#define MIN_BOARD_W    25
#define MIN_BOARD_H    12
#define BONUS_CHANCE    2
#define BONUS_LIFETIME 50
#define INITIAL_TICK_MS 200
#define MIN_TICK_MS     60
#define SPEED_DECREASE   4

static int norm_d(int d) { if (d > 1) return -1; if (d < -1) return 1; return d; }

static const char *head_ch(Direction d) {
    if (d == DIR_UP) return CH_AU; if (d == DIR_DOWN) return CH_AD;
    if (d == DIR_LEFT) return CH_AL; return CH_AR;
}

static const char *seg_ch(int px,int py,int cx,int cy,int nx,int ny) {
    int d1x=norm_d(cx-px),d1y=norm_d(cy-py),d2x=norm_d(nx-cx),d2y=norm_d(ny-cy);
    int L,R,U,D;
    if(d1y==0&&d2y==0) return CH_H;
    if(d1x==0&&d2x==0) return CH_V;
    L=(d1x>0)||(d2x<0); R=(d1x<0)||(d2x>0);
    U=(d1y>0)||(d2y<0); D=(d1y<0)||(d2y>0);
    if(R&&D) return CH_TL; if(L&&D) return CH_TR;
    if(R&&U) return CH_BL; if(L&&U) return CH_BR;
    return CH_H;
}

static int is_on_snake(const Game *g,int x,int y) {
    Segment *c=g->head; while(c){if(c->x==x&&c->y==y)return 1;c=c->next;} return 0;
}

static void draw_hud(const Game *g) {
    char buf[32]; int hy,spd; if(!g)return; hy=g->board_h;
    screen_erase_line(hy); screen_erase_line(hy+1);
    screen_set_color_256(CLR_SCORE_L,-1); screen_put_str(2,hy,"SCORE:");
    int_to_str(g->score,buf,32); screen_set_color_256(CLR_SCORE_V,-1); screen_put_str(9,hy,buf);
    screen_set_color_256(CLR_SPEED_L,-1); screen_put_str(math_div(g->board_w,2)-3,hy,"HI:");
    int_to_str(g->high_score,buf,32); screen_set_color_256(CLR_HIGH,-1); screen_put_str(math_div(g->board_w,2)+1,hy,buf);
    screen_set_color_256(CLR_SPEED_L,-1); screen_put_str(g->board_w-12,hy,"SPEED:");
    spd=math_div(INITIAL_TICK_MS-g->tick_ms,SPEED_DECREASE)+1; if(spd<1)spd=1;
    int_to_str(spd,buf,32); screen_set_color_256(CLR_SCORE_V,-1); screen_put_str(g->board_w-5,hy,buf);
    screen_set_color_256(CLR_SPEED_L,-1); screen_put_str(2,hy+1,"WASD/Arrows:Move  Q:Quit  R:Restart");
    screen_reset_color();
}

static void draw_title(const Game *g) {
    int tx=math_div(g->board_w,2)-5; if(tx<1)tx=1;
    screen_set_color_256(CLR_TITLE,-1); screen_put_str(tx,0," S N A K E ");
    screen_reset_color();
}

static void death_animation(Game *g) {
    Segment *curr; int i,count,idx;
    int px[500],py[500];
    if(!g)return;
    count=0; curr=g->head;
    while(curr&&count<500){px[count]=curr->x;py[count]=curr->y;count++;curr=curr->next;}
    for(i=0;i<3;i++){
        for(idx=0;idx<count;idx++){screen_set_color_256(CLR_DEATH,-1);screen_put_utf8(px[idx],py[idx],CH_H);}
        screen_reset_color();screen_flush();usleep(120000);
        for(idx=0;idx<count;idx++){screen_set_color_256(CLR_BODY,-1);screen_put_utf8(px[idx],py[idx],CH_H);}
        screen_reset_color();screen_flush();usleep(120000);
    }
    for(idx=0;idx<count;idx++){screen_set_color_256(CLR_DEATH,-1);screen_put_utf8(px[idx],py[idx],CH_H);}
    screen_reset_color();screen_flush();usleep(200000);
    for(idx=count-1;idx>=0;idx--){
        screen_set_color_256(CLR_DEATH,-1);screen_put_utf8(px[idx],py[idx],CH_DOT);
        screen_reset_color();screen_flush();usleep(math_max(math_div(40000,math_max(count,1)),8000));
    }
    usleep(300000);
    for(idx=0;idx<count;idx++){screen_reset_color();screen_put_char(px[idx],py[idx],' ');screen_flush();
        usleep(math_max(math_div(30000,math_max(count,1)),5000));}
    usleep(200000);
}

void game_spawn_food(Game *g) {
    int occ; if(!g)return;
    do{ g->food.x=math_rand(1,g->board_w-2); g->food.y=math_rand(1,g->board_h-2);
        occ=is_on_snake(g,g->food.x,g->food.y);
        if(!occ&&g->bonus_active) occ=(g->bonus_food.x==g->food.x&&g->bonus_food.y==g->food.y);
    }while(occ);
    screen_set_color_256(CLR_FOOD,-1); screen_put_utf8(g->food.x,g->food.y,CH_FOOD); screen_reset_color();
}

static void game_spawn_bonus(Game *g) {
    int occ; if(!g)return;
    do{ g->bonus_food.x=math_rand(1,g->board_w-2); g->bonus_food.y=math_rand(1,g->board_h-2);
        occ=is_on_snake(g,g->bonus_food.x,g->bonus_food.y);
        if(!occ) occ=(g->food.x==g->bonus_food.x&&g->food.y==g->bonus_food.y);
    }while(occ);
    g->bonus_active=1; g->bonus_timer=BONUS_LIFETIME;
    screen_set_color_256(CLR_BONUS,-1); screen_put_utf8(g->bonus_food.x,g->bonus_food.y,CH_BONUS); screen_reset_color();
}

static void game_erase_bonus(Game *g) {
    if(!g||!g->bonus_active)return;
    screen_reset_color(); screen_put_char(g->bonus_food.x,g->bonus_food.y,' ');
    g->bonus_active=0; g->bonus_timer=0;
}

void game_init(Game *g) {
    int tc,tr; if(!g)return;
    screen_get_terminal_size(&tc,&tr);
    g->board_w=math_clamp(tc,MIN_BOARD_W,200); g->board_h=math_clamp(tr-3,MIN_BOARD_H,60);
    g->tick_ms=INITIAL_TICK_MS; g->base_tick_ms=INITIAL_TICK_MS;
    g->score=0; g->high_score=0; g->state=STATE_PLAYING; g->dir=DIR_RIGHT; g->length=4;
    g->bonus_active=0; g->bonus_timer=0; g->ticks_since_food=0;

    {
        Segment *s1 = (Segment*)mem_alloc(sizeof(Segment));
        Segment *s2 = (Segment*)mem_alloc(sizeof(Segment));
        Segment *s3 = (Segment*)mem_alloc(sizeof(Segment));
        Segment *s4 = (Segment*)mem_alloc(sizeof(Segment));
        int cx = math_div(g->board_w, 2);
        int cy = math_div(g->board_h, 2);

        if (s1 && s2 && s3 && s4) {
            s1->x = cx;     s1->y = cy; s1->next = s2;
            s2->x = cx - 1; s2->y = cy; s2->next = s3;
            s3->x = cx - 2; s3->y = cy; s3->next = s4;
            s4->x = cx - 3; s4->y = cy; s4->next = (Segment*)0;
            g->head = s1;
            g->tail = s4;
        } else {
            /* Fallback if mem_alloc somehow fails, just use 1 */
            if (s1) { s1->x = cx; s1->y = cy; s1->next = (Segment*)0; g->head = s1; g->tail = s1; g->length = 1; }
        }
    }

    g->food.x = 0; g->food.y = 0;
    game_spawn_food(g);
    game_full_redraw(g);
}

void game_handle_input(Game *g, char key) {
    if(!g)return;
    switch(key){
        case 'w':case 'W':if(g->dir!=DIR_DOWN)g->dir=DIR_UP;break;
        case 's':case 'S':if(g->dir!=DIR_UP)g->dir=DIR_DOWN;break;
        case 'a':case 'A':if(g->dir!=DIR_RIGHT)g->dir=DIR_LEFT;break;
        case 'd':case 'D':if(g->dir!=DIR_LEFT)g->dir=DIR_RIGHT;break;
        case 'r':case 'R':if(g->state==STATE_GAMEOVER){int hi=g->high_score;game_cleanup(g);game_init(g);g->high_score=hi;}break;
        default:break;
    }
}

void game_update(Game *g) {
    Segment *new_head,*curr,*old_h;
    int nx,ny,otx,oty,ate_food,ate_bonus;
    if(!g||g->state!=STATE_PLAYING)return;

    nx=g->head->x; ny=g->head->y;
    switch(g->dir){case DIR_UP:ny--;break;case DIR_DOWN:ny++;break;case DIR_LEFT:nx--;break;case DIR_RIGHT:nx++;break;}
    if(nx<=0)nx=g->board_w-2; if(nx>=g->board_w-1)nx=1;
    if(ny<=0)ny=g->board_h-2; if(ny>=g->board_h-1)ny=1;

    curr=g->head;
    while(curr){if(curr->x==nx&&curr->y==ny){death_animation(g);g->state=STATE_GAMEOVER;return;}curr=curr->next;}

    /* Alloc new head */
    new_head=(Segment*)mem_alloc(sizeof(Segment));
    if(!new_head){g->state=STATE_GAMEOVER;return;}
    new_head->x=nx; new_head->y=ny; new_head->next=g->head; g->head=new_head;
    old_h=g->head->next; /* old head */

    /* Draw new head arrow */
    screen_set_color_256(CLR_HEAD,-1);
    screen_put_utf8(nx,ny,head_ch(g->dir));
    screen_reset_color();

    /* Redraw old head as body segment with correct line char */
    screen_set_color_256(CLR_BODY,-1);
    if(old_h->next){
        screen_put_utf8(old_h->x,old_h->y, seg_ch(nx,ny,old_h->x,old_h->y,old_h->next->x,old_h->next->y));
    } else {
        /* Snake is 2 segments: just a straight piece */
        int dy=norm_d(old_h->y-ny);
        screen_put_utf8(old_h->x,old_h->y, (dy==0)?CH_H:CH_V);
    }
    screen_reset_color();

    ate_food=(nx==g->food.x&&ny==g->food.y);
    ate_bonus=(g->bonus_active&&nx==g->bonus_food.x&&ny==g->bonus_food.y);

    if(ate_food){
        g->score+=1; g->length++; g->ticks_since_food=0;
        g->tick_ms=math_max(g->tick_ms-SPEED_DECREASE,MIN_TICK_MS);
        if(g->score>g->high_score)g->high_score=g->score;
        game_spawn_food(g);
    } else if(ate_bonus){
        g->score+=5; g->length++; g->bonus_active=0; g->bonus_timer=0;
        g->tick_ms=math_max(g->tick_ms-math_mul(SPEED_DECREASE,2),MIN_TICK_MS);
        if(g->score>g->high_score)g->high_score=g->score;
    } else {
        otx=g->tail->x; oty=g->tail->y;
        if(g->head->next==g->tail){mem_free(g->tail);g->head->next=(Segment*)0;g->tail=g->head;}
        else{curr=g->head;while(curr->next!=g->tail)curr=curr->next;mem_free(g->tail);g->tail=curr;curr->next=(Segment*)0;}
        screen_reset_color(); screen_put_char(otx,oty,' ');
    }

    g->ticks_since_food++;
    if(g->bonus_active){g->bonus_timer--;if(g->bonus_timer<=0)game_erase_bonus(g);}
    else if(g->score>0&&math_rand(1,100)<=BONUS_CHANCE){game_spawn_bonus(g);}
}

void game_render(const Game *g) {
    if(!g)return; draw_hud(g);
    if(g->state==STATE_GAMEOVER){
        int cx=math_div(g->board_w,2),cy=math_div(g->board_h,2); char buf[32];
        screen_set_color(97,41); screen_put_str(cx-6,cy,"  GAME  OVER  "); screen_reset_color();
        screen_set_color_256(CLR_SCORE_V,-1); int_to_str(g->score,buf,32);
        screen_put_str(cx-7,cy+2,"Final Score: "); screen_put_str(cx+6,cy+2,buf);
        screen_set_color_256(CLR_SPEED_L,-1); screen_put_str(cx-9,cy+4,"R: Restart   Q: Quit"); screen_reset_color();
    }
    screen_flush();
}

int game_is_running(const Game *g){if(!g)return 0;return(g->state!=STATE_GAMEOVER);}

void game_full_redraw(Game *g) {
    Segment *prev,*curr,*next; int idx; if(!g)return;
    screen_clear();
    screen_set_color_256(CLR_BORDER,-1); screen_draw_border(g->board_w,g->board_h); screen_reset_color();
    draw_title(g);

    if (g->state == STATE_PLAYING) {
        prev=(Segment*)0; curr=g->head; idx=0;
        while(curr){
            next=curr->next;
            if(idx==0){
                screen_set_color_256(CLR_HEAD,-1); screen_put_utf8(curr->x,curr->y,head_ch(g->dir));
            } else {
                screen_set_color_256(CLR_BODY,-1);
                if(prev&&next) screen_put_utf8(curr->x,curr->y,seg_ch(prev->x,prev->y,curr->x,curr->y,next->x,next->y));
                else if(prev){ int dy=norm_d(curr->y-prev->y); screen_put_utf8(curr->x,curr->y,(dy==0)?CH_H:CH_V); }
                else screen_put_utf8(curr->x,curr->y,CH_H);
            }
            screen_reset_color(); prev=curr; curr=next; idx++;
        }
        screen_set_color_256(CLR_FOOD,-1); screen_put_utf8(g->food.x,g->food.y,CH_FOOD); screen_reset_color();
        if(g->bonus_active){screen_set_color_256(CLR_BONUS,-1);screen_put_utf8(g->bonus_food.x,g->bonus_food.y,CH_BONUS);screen_reset_color();}
    }

    draw_hud(g); screen_flush();
}

void game_cleanup(Game *g) {
    Segment *curr,*next; if(!g)return;
    curr=g->head; while(curr){next=curr->next;mem_free(curr);curr=next;}
    g->head=(Segment*)0; g->tail=(Segment*)0; g->length=0;
}
